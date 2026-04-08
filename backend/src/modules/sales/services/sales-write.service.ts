import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AppError } from '../../../common/errors/app-error';
import { computeInvoiceTotals } from '../../../common/utils/invoice-totals';
import { ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { HeldSaleDto } from '../dto/held-sale.dto';
import { UpsertSaleDto } from '../dto/upsert-sale.dto';
import { normalizeSalePayload } from '../helpers/sales-payload.helper';
import { SalesAuthorizationService } from './sales-authorization.service';
import { SalesFinanceService } from './sales-finance.service';
import { SalesQueryService } from './sales-query.service';

@Injectable()
export class SalesWriteService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly authz: SalesAuthorizationService,
    private readonly finance: SalesFinanceService,
    private readonly query: SalesQueryService,
  ) {}

  async createSale(payload: UpsertSaleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const normalized = normalizeSalePayload(payload);
    if (!normalized.items.length) throw new AppError('Sale must include at least one item', 'SALE_ITEMS_REQUIRED', 400);
    ensureUniqueFlowItems(normalized.items, 'SALE_DUPLICATE_PRODUCT', 'Sale must not contain duplicate product rows with the same unit');

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
      const { taxAmount, total } = computeInvoiceTotals(subtotal, normalized.discount, normalized.taxRate, normalized.pricesIncludeTax);
      if (normalized.storeCreditUsed > total + 0.0001) throw new AppError('Store credit cannot exceed invoice total', 'INVALID_STORE_CREDIT', 400);

      const collectibleTotal = Number(Math.max(0, total - normalized.storeCreditUsed).toFixed(2));
      if (normalized.paymentType !== 'credit' && !['admin', 'super_admin'].includes(auth.role) && (normalized.payments.some((entry) => entry.paymentChannel === 'cash') || normalized.paymentChannel === 'cash')) {
        const hasOpenShift = await this.authz.hasOpenCashierShift(trx, auth);
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
        : (normalized.payments.length ? normalized.payments : (collectibleTotal > 0 ? [{ paymentChannel: 'cash' as const, amount: collectibleTotal }] : []));
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
        await this.finance.createCustomerLedgerEntry(trx, customer.id, collectibleTotal, `فاتورة بيع S-${id}`, id, auth);
      } else {
        for (const payment of payments) {
          if (payment.paymentChannel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(trx, payment.amount, `فاتورة بيع S-${id} - نقدي`, id, auth, normalized.branchId, normalized.locationId);
        }
      }

      return id;
    });

    await this.audit.log('إنشاء فاتورة بيع', `تم إنشاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth.userId);
    const sale = await this.query.getSaleById(saleId, auth);
    const sales = await this.query.listSales({}, auth);
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
        await this.finance.createCustomerLedgerEntry(trx, sale.customer_id, -collectibleTotal, `عكس فاتورة بيع S-${saleId}`, saleId, auth);
      } else {
        const cashPayments = await trx.selectFrom('sale_payments').select(['amount', 'payment_channel']).where('sale_id', '=', saleId).execute();
        for (const payment of cashPayments) {
          if (payment.payment_channel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(trx, -Number(payment.amount || 0), `إلغاء فاتورة بيع S-${saleId}`, saleId, auth, sale.branch_id, sale.location_id);
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
    return { ok: true, sales: (await this.query.listSales({}, auth)).sales };
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
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  async deleteHeldSale(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.db.deleteFrom('held_sales').where('id', '=', id).execute();
    await this.audit.log('حذف فاتورة معلقة', `تم حذف فاتورة معلقة #${id} بواسطة ${auth.username}`, auth.userId);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  async clearHeldSales(auth: AuthContext): Promise<Record<string, unknown>> {
    await this.db.deleteFrom('held_sales').execute();
    await this.audit.log('حذف كل الفواتير المعلقة', `تم حذف كل الفواتير المعلقة بواسطة ${auth.username}`, auth.userId);
    return { ok: true, heldSales: [] };
  }
}
