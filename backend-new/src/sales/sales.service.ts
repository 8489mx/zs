import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { TransactionHelper } from '../database/helpers/transaction.helper';
import { HeldSaleDto } from './dto/held-sale.dto';
import { NormalizedSalePayload, UpsertSaleDto } from './dto/upsert-sale.dto';

type DbOrTx = Kysely<Database> | Transaction<Database>;

@Injectable()
export class SalesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private assertCanViewSales(auth: AuthContext): void {
    if (auth.role === 'super_admin') return;
    if (auth.permissions.includes('sales') || auth.permissions.includes('reports')) return;
    throw new ForbiddenException('Missing required permissions');
  }

  private normalizeSalePayload(payload: UpsertSaleDto): NormalizedSalePayload {
    const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
    const normalizedPayments = (Array.isArray(payload.payments) ? payload.payments : [])
      .map((entry) => ({
        paymentChannel: (entry.paymentChannel === 'card' ? 'card' : 'cash') as 'cash' | 'card',
        amount: Number(entry.amount || 0),
      }))
      .filter((entry) => entry.amount > 0);

    const fallbackChannel = payload.paymentChannel === 'card' ? 'card' : 'cash';
    const payments = paymentType === 'credit' ? [] : normalizedPayments;
    const paymentChannel: 'cash' | 'card' | 'mixed' | 'credit' = paymentType === 'credit' ? 'credit' : (payments.length > 1 ? 'mixed' : (payments[0]?.paymentChannel || fallbackChannel));

    return {
      customerId: payload.customerId ? Number(payload.customerId) : null,
      paymentType,
      paymentChannel,
      discount: Number(payload.discount || 0),
      taxRate: Number(payload.taxRate || 0),
      pricesIncludeTax: Boolean(payload.pricesIncludeTax),
      storeCreditUsed: Number(payload.storeCreditUsed || 0),
      note: String(payload.note || '').trim(),
      branchId: payload.branchId ? Number(payload.branchId) : null,
      locationId: payload.locationId ? Number(payload.locationId) : null,
      payments,
      items: payload.items
        .map((item) => ({
          productId: Number(item.productId || 0),
          qty: Number(item.qty || 0),
          price: Number(item.price || 0),
          unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
          unitMultiplier: Number(item.unitMultiplier || 1) || 1,
          priceType: (item.priceType === 'wholesale' ? 'wholesale' : 'retail') as 'retail' | 'wholesale',
        }))
        .filter((item) => item.productId > 0 && item.qty > 0),
    };
  }

  private computeTotals(subtotal: number, discount: number, taxRate: number, pricesIncludeTax: boolean): { taxAmount: number; total: number } {
    const safeSubtotal = Number(subtotal.toFixed(2));
    const safeDiscount = Number(Math.max(0, discount).toFixed(2));
    const taxableBase = Math.max(0, safeSubtotal - safeDiscount);
    const rate = Math.max(0, Number(taxRate || 0));
    if (pricesIncludeTax) {
      const total = Number(taxableBase.toFixed(2));
      const taxAmount = Number((total - total / (1 + rate / 100)).toFixed(2));
      return { taxAmount, total };
    }
    const taxAmount = Number((taxableBase * (rate / 100)).toFixed(2));
    return { taxAmount, total: Number((taxableBase + taxAmount).toFixed(2)) };
  }

  private async hasOpenCashierShift(queryable: DbOrTx, auth: AuthContext): Promise<boolean> {
    const row = await queryable
      .selectFrom('cashier_shifts')
      .select('id')
      .where('opened_by', '=', auth.userId)
      .where('status', '=', 'open')
      .orderBy('id desc')
      .executeTakeFirst();
    return Boolean(row?.id);
  }

  private async createCustomerLedgerEntry(
    queryable: DbOrTx,
    customerId: number,
    amount: number,
    note: string,
    referenceId: number,
    auth: AuthContext,
  ): Promise<void> {
    const customer = await queryable.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const nextBalance = Number(Number(customer.balance || 0) + amount).toFixed(2);
    await queryable
      .insertInto('customer_ledger')
      .values({
        customer_id: customerId,
        entry_type: amount >= 0 ? 'sale_credit' : 'sale_cancel_restore',
        amount,
        balance_after: Number(nextBalance),
        note,
        reference_type: 'sale',
        reference_id: referenceId,
        created_by: auth.userId,
      })
      .execute();
    await queryable.updateTable('customers').set({ balance: Number(nextBalance), updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async addTreasuryTransaction(queryable: DbOrTx, amount: number, note: string, saleId: number, auth: AuthContext, branchId: number | null, locationId: number | null): Promise<void> {
    await queryable
      .insertInto('treasury_transactions')
      .values({
        txn_type: amount >= 0 ? 'sale' : 'sale_cancel_restore',
        amount,
        note,
        reference_type: 'sale',
        reference_id: saleId,
        created_by: auth.userId,
        branch_id: branchId,
        location_id: locationId,
      })
      .execute();
  }

  private async mapSales(auth: AuthContext): Promise<Array<Record<string, unknown>>> {
    const sales = await this.db
      .selectFrom('sales as s')
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .leftJoin('branches as b', 'b.id', 's.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 's.location_id')
      .leftJoin('users as u', 'u.id', 's.created_by')
      .select([
        's.id', 's.doc_no', 's.customer_id', 'c.name as customer_name_ref', 's.customer_name', 's.payment_type', 's.payment_channel',
        's.subtotal', 's.discount', 's.tax_rate', 's.tax_amount', 's.prices_include_tax', 's.total', 's.paid_amount', 's.store_credit_used',
        's.status', 's.note', 's.branch_id', 's.location_id', 's.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('s.id desc')
      .execute();

    const items = await this.db
      .selectFrom('sale_items')
      .select(['id', 'sale_id', 'product_id', 'product_name', 'qty', 'unit_price', 'line_total', 'unit_name', 'unit_multiplier', 'cost_price', 'price_type'])
      .orderBy('sale_id asc')
      .orderBy('id asc')
      .execute();

    const payments = await this.db
      .selectFrom('sale_payments')
      .select(['id', 'sale_id', 'payment_channel', 'amount'])
      .orderBy('sale_id asc')
      .orderBy('id asc')
      .execute();

    const itemsBySale = new Map<string, Array<Record<string, unknown>>>();
    for (const item of items) {
      const key = String(item.sale_id);
      if (!itemsBySale.has(key)) itemsBySale.set(key, []);
      itemsBySale.get(key)!.push({
        id: String(item.id),
        productId: item.product_id ? String(item.product_id) : '',
        name: item.product_name || '',
        qty: Number(item.qty || 0),
        price: Number(item.unit_price || 0),
        total: Number(item.line_total || 0),
        unitName: item.unit_name || 'قطعة',
        unitMultiplier: Number(item.unit_multiplier || 1),
        cost: Number(item.cost_price || 0),
        priceType: item.price_type || 'retail',
      });
    }

    const paymentsBySale = new Map<string, Array<Record<string, unknown>>>();
    for (const payment of payments) {
      const key = String(payment.sale_id);
      if (!paymentsBySale.has(key)) paymentsBySale.set(key, []);
      paymentsBySale.get(key)!.push({
        id: String(payment.id),
        paymentChannel: payment.payment_channel || 'cash',
        amount: Number(payment.amount || 0),
      });
    }

    return sales.map((sale) => ({
      id: String(sale.id),
      docNo: sale.doc_no || `S-${sale.id}`,
      customerId: sale.customer_id ? String(sale.customer_id) : '',
      customerName: sale.customer_name_ref || sale.customer_name || 'عميل نقدي',
      paymentType: sale.payment_type || 'cash',
      paymentChannel: sale.payment_channel || 'cash',
      subTotal: Number(sale.subtotal || 0),
      discount: Number(sale.discount || 0),
      taxRate: Number(sale.tax_rate || 0),
      taxAmount: Number(sale.tax_amount || 0),
      pricesIncludeTax: Boolean(sale.prices_include_tax),
      total: Number(sale.total || 0),
      paidAmount: Number(sale.paid_amount || 0),
      storeCreditUsed: Number(sale.store_credit_used || 0),
      status: sale.status || 'posted',
      note: sale.note || '',
      createdBy: sale.created_by_name || '',
      date: sale.created_at,
      branchId: sale.branch_id ? String(sale.branch_id) : '',
      locationId: sale.location_id ? String(sale.location_id) : '',
      branchName: sale.branch_name || '',
      locationName: sale.location_name || '',
      items: itemsBySale.get(String(sale.id)) || [],
      payments: paymentsBySale.get(String(sale.id)) || [],
    }));
  }

  async listSales(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertCanViewSales(auth);
    const rows = await this.mapSales(auth);
    const q = String(query.search || query.q || '').toLowerCase();
    const filter = String(query.filter || query.view || 'all');
    const filtered = rows.filter((row) => {
      if (filter === 'cash' && row.paymentType !== 'cash') return false;
      if (filter === 'credit' && row.paymentType !== 'credit') return false;
      if (filter === 'cancelled' && row.status !== 'cancelled') return false;
      if (!q) return true;
      return [row.docNo, row.customerName, row.note, row.status].some((x) => String(x || '').toLowerCase().includes(q));
    });

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 30)));
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const today = new Date().toISOString().slice(0, 10);
    const todayRows = filtered.filter((row) => String(row.date || '').slice(0, 10) === today);
    const topCustomersMap = new Map<string, { name: string; total: number; count: number }>();
    for (const row of filtered) {
      const key = String(row.customerId || row.customerName || 'cash');
      const current = topCustomersMap.get(key) || { name: String(row.customerName || 'عميل نقدي'), total: 0, count: 0 };
      current.total += Number(row.total || 0);
      current.count += 1;
      topCustomersMap.set(key, current);
    }

    return {
      sales: paged,
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        totalItems,
        totalSales: Number(filtered.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        todaySalesCount: todayRows.length,
        todaySalesTotal: Number(todayRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        cashTotal: Number(filtered.filter((row) => row.paymentType === 'cash').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        creditTotal: Number(filtered.filter((row) => row.paymentType === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        cancelledCount: filtered.filter((row) => row.status === 'cancelled').length,
        topCustomers: [...topCustomersMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      },
    };
  }

  async getSaleById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertCanViewSales(auth);
    const rows = await this.mapSales(auth);
    const sale = rows.find((entry) => Number(entry.id) === Number(id));
    if (!sale) throw new AppError('Sale not found', 'SALE_NOT_FOUND', 404);
    return { sale };
  }

  async createSale(payload: UpsertSaleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const normalized = this.normalizeSalePayload(payload);
    if (!normalized.items.length) throw new AppError('Sale must include at least one item', 'SALE_ITEMS_REQUIRED', 400);

    const saleId = await this.tx.runInTransaction(this.db, async (trx) => {
      if (normalized.discount < 0) throw new AppError('Discount cannot be negative', 'INVALID_DISCOUNT', 400);
      if (normalized.storeCreditUsed < 0) throw new AppError('Store credit cannot be negative', 'INVALID_STORE_CREDIT', 400);

      const customer = normalized.customerId
        ? await trx.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit', 'store_credit_balance']).where('id', '=', normalized.customerId).where('is_active', '=', true).executeTakeFirst()
        : null;
      if (normalized.customerId && !customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
      if (normalized.paymentType === 'credit' && !customer) throw new AppError('Credit sale requires a customer', 'CUSTOMER_REQUIRED_FOR_CREDIT', 400);

      let subtotal = 0;
      const preparedItems: Array<{ productId: number; productName: string; qty: number; unitPrice: number; lineTotal: number; unitName: string; unitMultiplier: number; priceType: 'retail' | 'wholesale'; costPrice: number; requiredQty: number; beforeQty: number; afterQty: number }> = [];
      for (const item of normalized.items) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty', 'retail_price', 'wholesale_price', 'cost_price']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const requiredQty = Number(item.qty) * Number(item.unitMultiplier || 1);
        const beforeQty = Number(product.stock_qty || 0);
        if (beforeQty < requiredQty) throw new AppError(`Insufficient stock for ${product.name}`, 'INSUFFICIENT_STOCK', 400);
        const lineTotal = Number((item.qty * item.price).toFixed(2));
        subtotal += lineTotal;
        preparedItems.push({
          productId: Number(product.id),
          productName: product.name || '',
          qty: item.qty,
          unitPrice: item.price,
          lineTotal,
          unitName: item.unitName,
          unitMultiplier: item.unitMultiplier,
          priceType: item.priceType,
          costPrice: Number((Number(product.cost_price || 0) * item.unitMultiplier).toFixed(2)),
          requiredQty,
          beforeQty,
          afterQty: Number((beforeQty - requiredQty).toFixed(3)),
        });
      }

      if (normalized.discount > subtotal) throw new AppError('Discount cannot exceed subtotal', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = this.computeTotals(subtotal, normalized.discount, normalized.taxRate, normalized.pricesIncludeTax);
      if (normalized.storeCreditUsed > total + 0.0001) throw new AppError('Store credit cannot exceed invoice total', 'INVALID_STORE_CREDIT', 400);

      const collectibleTotal = Number(Math.max(0, total - normalized.storeCreditUsed).toFixed(2));
      if (normalized.paymentType !== 'credit' && !['admin', 'super_admin'].includes(auth.role) && (normalized.payments.some((entry) => entry.paymentChannel === 'cash') || normalized.paymentChannel === 'cash')) {
        const hasOpenShift = await this.hasOpenCashierShift(trx, auth);
        if (!hasOpenShift) throw new AppError('Open cashier shift is required before posting a cash sale', 'OPEN_SHIFT_REQUIRED', 400);
      }

      if (normalized.paymentType === 'credit' && customer) {
        const nextBalance = Number(customer.balance || 0) + collectibleTotal;
        if (Number(customer.credit_limit || 0) > 0 && nextBalance > Number(customer.credit_limit || 0)) {
          throw new AppError('Customer credit limit exceeded', 'CUSTOMER_CREDIT_LIMIT', 400);
        }
      }

      if (normalized.storeCreditUsed > 0) {
        if (!customer) throw new AppError('Store credit requires a customer', 'CUSTOMER_REQUIRED_FOR_CREDIT', 400);
        if (normalized.storeCreditUsed > Number(customer.store_credit_balance || 0) + 0.0001) {
          throw new AppError('Store credit exceeds available balance', 'STORE_CREDIT_EXCEEDED', 400);
        }
      }

      const payments = normalized.paymentType === 'credit'
        ? []
        : (normalized.payments.length
          ? normalized.payments
          : (collectibleTotal > 0 ? [{ paymentChannel: 'cash' as const, amount: collectibleTotal }] : []));
      const paidAmount = Number(payments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0).toFixed(2));
      if (normalized.paymentType !== 'credit' && paidAmount + 0.0001 < collectibleTotal) {
        throw new AppError('Paid amount cannot be less than invoice total', 'INVALID_PAID_AMOUNT', 400);
      }

      const saleInsert = await trx
        .insertInto('sales')
        .values({
          customer_id: normalized.customerId,
          customer_name: customer?.name || 'عميل نقدي',
          payment_type: normalized.paymentType,
          payment_channel: normalized.paymentType === 'credit' ? 'credit' : (payments.length > 1 ? 'mixed' : (payments[0]?.paymentChannel || 'cash')),
          subtotal: Number(subtotal.toFixed(2)),
          discount: normalized.discount,
          tax_rate: normalized.taxRate,
          tax_amount: taxAmount,
          prices_include_tax: normalized.pricesIncludeTax,
          total,
          paid_amount: paidAmount,
          store_credit_used: normalized.storeCreditUsed,
          status: 'posted',
          note: normalized.note,
          branch_id: normalized.branchId,
          location_id: normalized.locationId,
          created_by: auth.userId,
          cancel_reason: '',
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(saleInsert.id);
      await trx.updateTable('sales').set({ doc_no: `S-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).execute();

      for (const payment of payments) {
        await trx.insertInto('sale_payments').values({ sale_id: id, payment_channel: payment.paymentChannel, amount: payment.amount }).execute();
      }

      for (const item of preparedItems) {
        await trx
          .insertInto('sale_items')
          .values({
            sale_id: id,
            product_id: item.productId,
            product_name: item.productName,
            qty: item.qty,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
            unit_name: item.unitName,
            unit_multiplier: item.unitMultiplier,
            cost_price: item.costPrice,
            price_type: item.priceType as 'retail' | 'wholesale',
          })
          .execute();

        await trx.updateTable('products').set({ stock_qty: item.afterQty, stock: item.afterQty, updated_at: sql`NOW()` }).where('id', '=', item.productId).execute();
        await trx
          .insertInto('stock_movements')
          .values({
            product_id: item.productId,
            movement_type: 'sale',
            qty: -item.requiredQty,
            before_qty: item.beforeQty,
            after_qty: item.afterQty,
            reason: 'sale',
            note: `Sale S-${id}`,
            reference_type: 'sale',
            reference_id: id,
            branch_id: normalized.branchId,
            location_id: normalized.locationId,
            created_by: auth.userId,
          })
          .execute();
      }

      if (normalized.storeCreditUsed > 0 && customer) {
        await trx
          .updateTable('customers')
          .set({ store_credit_balance: Number((Number(customer.store_credit_balance || 0) - normalized.storeCreditUsed).toFixed(2)), updated_at: sql`NOW()` })
          .where('id', '=', customer.id)
          .execute();
      }

      if (normalized.paymentType === 'credit' && customer && collectibleTotal > 0) {
        await this.createCustomerLedgerEntry(trx, customer.id, collectibleTotal, `فاتورة بيع S-${id}`, id, auth);
      } else {
        for (const payment of payments) {
          if (payment.paymentChannel !== 'cash') continue;
          await this.addTreasuryTransaction(trx, payment.amount, `فاتورة بيع S-${id} - نقدي`, id, auth, normalized.branchId, normalized.locationId);
        }
      }

      return id;
    });

    await this.audit.log('إنشاء فاتورة بيع', `تم إنشاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth.userId);
    const sale = await this.getSaleById(saleId, auth);
    const sales = await this.listSales({}, auth);
    return { ok: true, sale: sale.sale, sales: sales.sales };
  }

  async cancelSale(saleId: number, reason: string, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const sale = await trx.selectFrom('sales').selectAll().where('id', '=', saleId).executeTakeFirst();
      if (!sale) throw new AppError('Sale not found', 'SALE_NOT_FOUND', 404);
      if (sale.status === 'cancelled') throw new AppError('Sale already cancelled', 'SALE_ALREADY_CANCELLED', 400);

      const items = await trx.selectFrom('sale_items').selectAll().where('sale_id', '=', saleId).execute();
      for (const item of items) {
        if (!item.product_id) continue;
        const product = await trx.selectFrom('products').select(['stock_qty']).where('id', '=', item.product_id).executeTakeFirst();
        if (!product) continue;
        const restoreQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const beforeQty = Number(product.stock_qty || 0);
        const afterQty = Number((beforeQty + restoreQty).toFixed(3));
        await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', item.product_id).execute();
        await trx
          .insertInto('stock_movements')
          .values({
            product_id: item.product_id,
            movement_type: 'sale_cancel',
            qty: restoreQty,
            before_qty: beforeQty,
            after_qty: afterQty,
            reason: 'sale_cancel',
            note: `Cancel S-${saleId}`,
            reference_type: 'sale',
            reference_id: saleId,
            branch_id: sale.branch_id,
            location_id: sale.location_id,
            created_by: auth.userId,
          })
          .execute();
      }

      const collectibleTotal = Math.max(0, Number(sale.total || 0) - Number(sale.store_credit_used || 0));
      if (sale.payment_type === 'credit' && sale.customer_id && collectibleTotal > 0) {
        await this.createCustomerLedgerEntry(trx, sale.customer_id, -collectibleTotal, `عكس فاتورة بيع S-${saleId}`, saleId, auth);
      } else {
        const cashPayments = await trx.selectFrom('sale_payments').select(['amount', 'payment_channel']).where('sale_id', '=', saleId).execute();
        for (const payment of cashPayments) {
          if (payment.payment_channel !== 'cash') continue;
          await this.addTreasuryTransaction(trx, -Number(payment.amount || 0), `إلغاء فاتورة بيع S-${saleId}`, saleId, auth, sale.branch_id, sale.location_id);
        }
      }

      if (Number(sale.store_credit_used || 0) > 0 && sale.customer_id) {
        const customer = await trx.selectFrom('customers').select(['store_credit_balance']).where('id', '=', sale.customer_id).executeTakeFirst();
        if (customer) {
          await trx.updateTable('customers').set({ store_credit_balance: Number((Number(customer.store_credit_balance || 0) + Number(sale.store_credit_used || 0)).toFixed(2)), updated_at: sql`NOW()` }).where('id', '=', sale.customer_id).execute();
        }
      }

      await trx
        .updateTable('sales')
        .set({ status: 'cancelled', cancel_reason: String(reason || '').trim(), cancelled_by: auth.userId, cancelled_at: sql`NOW()`, updated_at: sql`NOW()` })
        .where('id', '=', saleId)
        .execute();
    });

    await this.audit.log('إلغاء فاتورة بيع', `تم إلغاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth.userId);
    return { ok: true, sales: (await this.listSales({}, auth)).sales };
  }

  async listHeldSales(_auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('held_sales as hs')
      .leftJoin('customers as c', 'c.id', 'hs.customer_id')
      .select([
        'hs.id', 'hs.customer_id', 'hs.payment_type', 'hs.payment_channel', 'hs.paid_amount', 'hs.cash_amount', 'hs.card_amount',
        'hs.discount', 'hs.note', 'hs.search', 'hs.price_type', 'hs.branch_id', 'hs.location_id', 'hs.created_at', 'c.name as customer_name',
      ])
      .orderBy('hs.id desc')
      .execute();

    const items = await this.db
      .selectFrom('held_sale_items')
      .select(['id', 'held_sale_id', 'product_id', 'product_name', 'qty', 'unit_price', 'unit_name', 'unit_multiplier', 'price_type'])
      .orderBy('held_sale_id asc')
      .orderBy('id asc')
      .execute();

    const itemsByDraft = new Map<string, Array<Record<string, unknown>>>();
    for (const item of items) {
      const key = String(item.held_sale_id);
      if (!itemsByDraft.has(key)) itemsByDraft.set(key, []);
      itemsByDraft.get(key)!.push({
        productId: item.product_id ? String(item.product_id) : '',
        name: item.product_name || '',
        qty: Number(item.qty || 0),
        price: Number(item.unit_price || 0),
        unitName: item.unit_name || 'قطعة',
        unitMultiplier: Number(item.unit_multiplier || 1),
        priceType: item.price_type || 'retail',
        lineKey: `${item.product_id || ''}::${item.unit_name || 'قطعة'}::${item.price_type || 'retail'}`,
      });
    }

    return {
      heldSales: rows.map((row) => ({
        id: String(row.id),
        savedAt: row.created_at,
        customerId: row.customer_id ? String(row.customer_id) : '',
        customerName: row.customer_name || '',
        paymentType: row.payment_type === 'credit' ? 'credit' : 'cash',
        paymentChannel: row.payment_type === 'credit' ? 'credit' : (row.payment_channel || 'cash'),
        paidAmount: Number(row.paid_amount || 0),
        cashAmount: Number(row.cash_amount || 0),
        cardAmount: Number(row.card_amount || 0),
        discount: Number(row.discount || 0),
        note: row.note || '',
        search: row.search || '',
        priceType: row.price_type || 'retail',
        branchId: row.branch_id ? String(row.branch_id) : '',
        locationId: row.location_id ? String(row.location_id) : '',
        cart: itemsByDraft.get(String(row.id)) || [],
      })),
    };
  }

  async saveHeldSale(payload: HeldSaleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const heldSaleId = await this.tx.runInTransaction(this.db, async (trx) => {
      const items = (Array.isArray(payload.items) ? payload.items : [])
        .map((item) => ({
          productId: Number(item.productId || 0),
          productName: String(item.name || '').trim(),
          qty: Number(item.qty || 0),
          unitPrice: Number(item.price || 0),
          unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
          unitMultiplier: Number(item.unitMultiplier || 1) || 1,
          priceType: (item.priceType === 'wholesale' ? 'wholesale' : 'retail') as 'retail' | 'wholesale',
        }))
        .filter((entry) => entry.productId > 0 && entry.qty > 0);

      if (!items.length) throw new AppError('Held draft must include at least one item', 'HELD_DRAFT_ITEMS_REQUIRED', 400);

      const cashAmount = Math.max(0, Number(payload.cashAmount || 0));
      const cardAmount = Math.max(0, Number(payload.cardAmount || 0));
      const paidAmount = Number((cashAmount + cardAmount).toFixed(2));
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
      const paymentChannel = paymentType === 'credit' ? 'credit' : ((cashAmount > 0 && cardAmount > 0) ? 'mixed' : (cardAmount > 0 ? 'card' : 'cash'));

      const heldInsert = await trx
        .insertInto('held_sales')
        .values({
          customer_id: payload.customerId ? Number(payload.customerId) : null,
          payment_type: paymentType,
          payment_channel: paymentChannel,
          paid_amount: paidAmount,
          cash_amount: cashAmount,
          card_amount: cardAmount,
          discount: Number(payload.discount || 0),
          note: String(payload.note || '').trim(),
          search: String(payload.search || '').trim(),
          price_type: payload.priceType === 'wholesale' ? 'wholesale' : 'retail',
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_id: payload.locationId ? Number(payload.locationId) : null,
          created_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(heldInsert.id);
      for (const item of items) {
        await trx
          .insertInto('held_sale_items')
          .values({
            held_sale_id: id,
            product_id: item.productId,
            product_name: item.productName,
            qty: item.qty,
            unit_price: item.unitPrice,
            unit_name: item.unitName,
            unit_multiplier: item.unitMultiplier,
            price_type: item.priceType as 'retail' | 'wholesale',
          })
          .execute();
      }

      return id;
    });

    await this.audit.log('حفظ فاتورة معلقة', `تم حفظ فاتورة معلقة #${heldSaleId} بواسطة ${auth.username}`, auth.userId);
    return { ok: true, heldSales: (await this.listHeldSales(auth)).heldSales };
  }

  async deleteHeldSale(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.db.deleteFrom('held_sales').where('id', '=', id).execute();
    await this.audit.log('حذف فاتورة معلقة', `تم حذف فاتورة معلقة #${id} بواسطة ${auth.username}`, auth.userId);
    return { ok: true, heldSales: (await this.listHeldSales(auth)).heldSales };
  }

  async clearHeldSales(auth: AuthContext): Promise<Record<string, unknown>> {
    await this.db.deleteFrom('held_sales').execute();
    await this.audit.log('حذف كل الفواتير المعلقة', `تم حذف كل الفواتير المعلقة بواسطة ${auth.username}`, auth.userId);
    return { ok: true, heldSales: [] };
  }
}
