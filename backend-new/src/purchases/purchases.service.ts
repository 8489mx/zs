import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { TransactionHelper } from '../database/helpers/transaction.helper';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-party-payment.dto';
import { UpsertPurchaseDto } from './dto/upsert-purchase.dto';

type DbOrTx = Kysely<Database> | Transaction<Database>;

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private hasPermission(auth: AuthContext, permission: string): boolean {
    return auth.role === 'super_admin' || auth.permissions.includes(permission);
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

  private async addSupplierLedgerEntry(
    queryable: DbOrTx,
    supplierId: number,
    amount: number,
    entryType: string,
    note: string,
    referenceType: string,
    referenceId: number,
    actor: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const supplier = await queryable.selectFrom('suppliers').select(['balance']).where('id', '=', supplierId).executeTakeFirstOrThrow();
    const balanceAfter = Number((Number(supplier.balance || 0) + amount).toFixed(2));
    await queryable
      .insertInto('supplier_ledger')
      .values({
        supplier_id: supplierId,
        entry_type: entryType,
        amount,
        balance_after: balanceAfter,
        note,
        reference_type: referenceType,
        reference_id: referenceId,
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
      })
      .execute();

    await queryable.updateTable('suppliers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', supplierId).execute();
  }

  private async addCustomerLedgerEntry(
    queryable: DbOrTx,
    customerId: number,
    amount: number,
    note: string,
    referenceType: string,
    referenceId: number,
    actor: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const customer = await queryable.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const balanceAfter = Number((Number(customer.balance || 0) + amount).toFixed(2));
    await queryable
      .insertInto('customer_ledger')
      .values({
        customer_id: customerId,
        entry_type: 'customer_payment',
        amount,
        balance_after: balanceAfter,
        note,
        reference_type: referenceType,
        reference_id: referenceId,
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
      })
      .execute();

    await queryable.updateTable('customers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async addTreasuryTransaction(
    queryable: DbOrTx,
    txnType: string,
    amount: number,
    note: string,
    referenceType: string,
    referenceId: number,
    actor: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    await queryable
      .insertInto('treasury_transactions')
      .values({
        txn_type: txnType,
        amount,
        note,
        reference_type: referenceType,
        reference_id: referenceId,
        branch_id: branchId,
        location_id: locationId,
        created_by: actor.userId,
      })
      .execute();
  }

  private async mapPurchases(): Promise<Array<Record<string, unknown>>> {
    const purchases = await this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('p.id desc')
      .execute();

    const items = await this.db
      .selectFrom('purchase_items')
      .select(['id', 'purchase_id', 'product_id', 'product_name', 'qty', 'unit_cost', 'line_total', 'unit_name', 'unit_multiplier'])
      .orderBy('purchase_id asc')
      .orderBy('id asc')
      .execute();

    const byPurchase = new Map<string, Array<Record<string, unknown>>>();
    for (const item of items) {
      const key = String(item.purchase_id);
      if (!byPurchase.has(key)) byPurchase.set(key, []);
      byPurchase.get(key)!.push({
        id: String(item.id),
        productId: item.product_id ? String(item.product_id) : '',
        name: item.product_name || '',
        qty: Number(item.qty || 0),
        cost: Number(item.unit_cost || 0),
        total: Number(item.line_total || 0),
        unitName: item.unit_name || 'قطعة',
        unitMultiplier: Number(item.unit_multiplier || 1),
      });
    }

    return purchases.map((entry) => ({
      id: String(entry.id),
      docNo: entry.doc_no || `PUR-${entry.id}`,
      supplierId: entry.supplier_id ? String(entry.supplier_id) : '',
      supplierName: entry.supplier_name || '',
      paymentType: entry.payment_type || 'cash',
      subTotal: Number(entry.subtotal || 0),
      discount: Number(entry.discount || 0),
      taxRate: Number(entry.tax_rate || 0),
      taxAmount: Number(entry.tax_amount || 0),
      pricesIncludeTax: Boolean(entry.prices_include_tax),
      total: Number(entry.total || 0),
      note: entry.note || '',
      status: entry.status || 'posted',
      createdBy: entry.created_by_name || '',
      date: entry.created_at,
      branchId: entry.branch_id ? String(entry.branch_id) : '',
      locationId: entry.location_id ? String(entry.location_id) : '',
      branchName: entry.branch_name || '',
      locationName: entry.location_name || '',
      items: byPurchase.get(String(entry.id)) || [],
    }));
  }

  async listPurchases(query: Record<string, unknown>, _auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.mapPurchases();
    const q = String(query.search || query.q || '').trim().toLowerCase();
    const filter = String(query.filter || query.view || 'all').trim();
    const filtered = rows.filter((row) => {
      if (filter === 'cash' && row.paymentType !== 'cash') return false;
      if (filter === 'credit' && row.paymentType !== 'credit') return false;
      if (filter === 'cancelled' && row.status !== 'cancelled') return false;
      if (!q) return true;
      return [row.docNo, row.supplierName, row.status, row.paymentType, row.branchName, row.locationName, row.note]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    const topBySupplier = new Map<string, { name: string; total: number; count: number }>();
    for (const row of filtered) {
      const key = String(row.supplierId || row.supplierName || 'unknown');
      const current = topBySupplier.get(key) || { name: String(row.supplierName || 'بدون مورد'), total: 0, count: 0 };
      current.total += Number(row.total || 0);
      current.count += 1;
      topBySupplier.set(key, current);
    }

    return {
      purchases: filtered.slice(start, start + pageSize),
      pagination: { page: safePage, pageSize, totalItems, totalPages },
      summary: {
        totalItems,
        totalAmount: Number(filtered.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        creditTotal: Number(filtered.filter((row) => row.paymentType === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        cancelledCount: filtered.filter((row) => row.status === 'cancelled').length,
        posted: filtered.filter((row) => row.status === 'posted').length,
        draft: filtered.filter((row) => row.status !== 'posted').length,
        topSuppliers: [...topBySupplier.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      },
    };
  }

  async createPurchase(payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const purchaseId = await this.tx.runInTransaction(this.db, async (trx) => {
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', payload.supplierId).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

      const items = payload.items || [];
      if (!items.length) throw new AppError('Purchase must include at least one item', 'PURCHASE_ITEMS_REQUIRED', 400);

      const normalizedItems: Array<{ productId: number; name: string; qty: number; cost: number; unitName: string; unitMultiplier: number; total: number }> = [];
      for (const item of items) {
        const product = await trx.selectFrom('products').select(['id', 'name']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const unitMultiplier = Number(item.unitMultiplier || 1) || 1;
        normalizedItems.push({
          productId: item.productId,
          name: String(item.name || product.name || '').trim(),
          qty: Number(item.qty || 0),
          cost: Number(item.cost || 0),
          unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
          unitMultiplier,
          total: Number((Number(item.qty || 0) * Number(item.cost || 0)).toFixed(2)),
        });
      }

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
      const discount = Number(payload.discount || 0);
      if (!this.hasPermission(auth, 'canDiscount') && Math.abs(discount) > 0.0001) {
        throw new AppError('Discount change is not allowed', 'DISCOUNT_NOT_ALLOWED', 403);
      }
      if (discount < 0 || discount > subtotal) throw new AppError('Discount is invalid', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = this.computeTotals(subtotal, discount, Number(payload.taxRate || 0), Boolean(payload.pricesIncludeTax));
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';

      const insert = await trx
        .insertInto('purchases')
        .values({
          supplier_id: supplier.id,
          payment_type: paymentType,
          subtotal: Number(subtotal.toFixed(2)),
          discount,
          tax_rate: Number(payload.taxRate || 0),
          tax_amount: taxAmount,
          prices_include_tax: Boolean(payload.pricesIncludeTax),
          total,
          note: String(payload.note || '').trim(),
          status: 'posted',
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_id: payload.locationId ? Number(payload.locationId) : null,
          created_by: auth.userId,
          cancel_reason: '',
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(insert.id);
      await trx.updateTable('purchases').set({ doc_no: `PUR-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).execute();

      for (const item of normalizedItems) {
        await trx
          .insertInto('purchase_items')
          .values({
            purchase_id: id,
            product_id: item.productId,
            product_name: item.name,
            qty: item.qty,
            unit_cost: item.cost,
            line_total: item.total,
            unit_name: item.unitName,
            unit_multiplier: item.unitMultiplier,
          })
          .execute();

        const current = await trx.selectFrom('products').select(['stock_qty']).where('id', '=', item.productId).executeTakeFirst();
        const beforeQty = Number(current?.stock_qty || 0);
        const increasedQty = Number((item.qty * item.unitMultiplier).toFixed(3));
        const afterQty = Number((beforeQty + increasedQty).toFixed(3));
        await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, cost_price: item.cost, cost: item.cost, updated_at: sql`NOW()` }).where('id', '=', item.productId).execute();
        await trx
          .insertInto('stock_movements')
          .values({
            product_id: item.productId,
            movement_type: 'purchase',
            qty: increasedQty,
            before_qty: beforeQty,
            after_qty: afterQty,
            reason: 'purchase',
            note: `فاتورة شراء PUR-${id}`,
            reference_type: 'purchase',
            reference_id: id,
            branch_id: payload.branchId ? Number(payload.branchId) : null,
            location_id: payload.locationId ? Number(payload.locationId) : null,
            created_by: auth.userId,
          })
          .execute();
      }

      if (paymentType === 'credit') {
        await this.addSupplierLedgerEntry(trx, supplier.id, total, 'purchase_credit', `فاتورة شراء PUR-${id}`, 'purchase', id, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      } else {
        await this.addTreasuryTransaction(trx, 'purchase', -total, `فاتورة شراء PUR-${id}`, 'purchase', id, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      }

      return id;
    });

    await this.audit.log('شراء', `تم تسجيل فاتورة شراء PUR-${purchaseId} بواسطة ${auth.username}`, auth.userId);
    const purchase = (await this.mapPurchases()).find((entry) => Number(entry.id) === purchaseId) || null;
    const purchases = await this.listPurchases({}, auth);
    return { ok: true, purchase, purchases: purchases.purchases };
  }

  async updatePurchase(purchaseId: number, payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Cancelled purchase cannot be edited', 'PURCHASE_CANCELLED', 400);

      const oldItems = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).execute();
      if (!(payload.items || []).length) throw new AppError('Purchase must include at least one item', 'PURCHASE_ITEMS_REQUIRED', 400);
      if (!(Number(payload.supplierId || 0) > 0)) throw new AppError('Supplier is required', 'SUPPLIER_REQUIRED', 400);
      for (const item of oldItems) {
        if (!item.product_id) continue;
        const product = await trx.selectFrom('products').select(['stock_qty']).where('id', '=', item.product_id).executeTakeFirst();
        if (!product) continue;
        const removeQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const beforeQty = Number(product.stock_qty || 0);
        if (beforeQty < removeQty) throw new AppError(`Cannot edit purchase because stock would go negative for product #${item.product_id}`, 'PURCHASE_EDIT_STOCK_INVALID', 400);
      }

      for (const item of oldItems) {
        if (!item.product_id) continue;
        const product = await trx.selectFrom('products').select(['stock_qty']).where('id', '=', item.product_id).executeTakeFirst();
        if (!product) continue;
        const removeQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const beforeQty = Number(product.stock_qty || 0);
        const afterQty = Number((beforeQty - removeQty).toFixed(3));
        await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', item.product_id).execute();
        await trx.insertInto('stock_movements').values({
          product_id: item.product_id,
          movement_type: 'purchase_edit_restore',
          qty: -removeQty,
          before_qty: beforeQty,
          after_qty: afterQty,
          reason: 'purchase_edit_restore',
          note: `Edit restore ${purchase.doc_no || purchase.id}`,
          reference_type: 'purchase',
          reference_id: purchaseId,
          created_by: auth.userId,
        }).execute();
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        await this.addSupplierLedgerEntry(trx, purchase.supplier_id, -Number(purchase.total || 0), 'purchase_edit_restore', `عكس فاتورة شراء ${purchase.doc_no || purchase.id} قبل التعديل`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      } else {
        await this.addTreasuryTransaction(trx, 'purchase_edit_restore', Number(purchase.total || 0), `عكس فاتورة شراء ${purchase.doc_no || purchase.id} قبل التعديل`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      }

      await trx.deleteFrom('purchase_items').where('purchase_id', '=', purchaseId).execute();

      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', payload.supplierId).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      const oldByProduct = new Map<number, number>();
      for (const item of oldItems) {
        if (!item.product_id) continue;
        oldByProduct.set(Number(item.product_id), Number(item.unit_cost || 0));
      }

      let subtotal = 0;
      for (const item of payload.items || []) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const incomingCost = Number(item.cost || 0);
        const originalCost = oldByProduct.has(Number(item.productId)) ? Number(oldByProduct.get(Number(item.productId)) || 0) : incomingCost;
        if (Math.abs(incomingCost - originalCost) > 0.0001 && !this.hasPermission(auth, 'canEditPrice')) {
          throw new AppError(`Cost edit is not allowed for ${product.name}`, 'COST_EDIT_NOT_ALLOWED', 403);
        }
        const unitMultiplier = Number(item.unitMultiplier || 1) || 1;
        const lineTotal = Number((Number(item.qty || 0) * incomingCost).toFixed(2));
        subtotal += lineTotal;

        await trx.insertInto('purchase_items').values({
          purchase_id: purchaseId,
          product_id: item.productId,
          product_name: String(item.name || product.name || '').trim(),
          qty: Number(item.qty || 0),
          unit_cost: incomingCost,
          line_total: lineTotal,
          unit_name: String(item.unitName || 'قطعة').trim() || 'قطعة',
          unit_multiplier: unitMultiplier,
        }).execute();

        const beforeQty = Number(product.stock_qty || 0);
        const increaseQty = Number((Number(item.qty || 0) * unitMultiplier).toFixed(3));
        const afterQty = Number((beforeQty + increaseQty).toFixed(3));
        await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, cost_price: incomingCost, cost: incomingCost, updated_at: sql`NOW()` }).where('id', '=', item.productId).execute();
        await trx.insertInto('stock_movements').values({
          product_id: item.productId,
          movement_type: 'purchase_edit_apply',
          qty: increaseQty,
          before_qty: beforeQty,
          after_qty: afterQty,
          reason: 'purchase_edit_apply',
          note: `Edit apply ${purchase.doc_no || purchase.id}`,
          reference_type: 'purchase',
          reference_id: purchaseId,
          created_by: auth.userId,
        }).execute();
      }

      const discount = Number(payload.discount || 0);
      if (!this.hasPermission(auth, 'canDiscount') && Math.abs(discount - Number(purchase.discount || 0)) > 0.0001) {
        throw new AppError('Discount change is not allowed', 'DISCOUNT_NOT_ALLOWED', 403);
      }
      if (discount < 0 || discount > subtotal) throw new AppError('Discount is invalid', 'INVALID_DISCOUNT', 400);
      const totals = this.computeTotals(subtotal, discount, Number(payload.taxRate || 0), Boolean(payload.pricesIncludeTax));
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';

      if (paymentType === 'credit') {
        await this.addSupplierLedgerEntry(trx, supplier.id, totals.total, 'purchase_edit_apply', `تطبيق تعديل فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      } else {
        await this.addTreasuryTransaction(trx, 'purchase_edit_apply', -totals.total, `تطبيق تعديل فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      }

      await trx.updateTable('purchases').set({
        supplier_id: supplier.id,
        payment_type: paymentType,
        subtotal: Number(subtotal.toFixed(2)),
        discount,
        tax_rate: Number(payload.taxRate || 0),
        tax_amount: totals.taxAmount,
        prices_include_tax: Boolean(payload.pricesIncludeTax),
        total: totals.total,
        note: String(payload.note || '').trim(),
        branch_id: payload.branchId ? Number(payload.branchId) : null,
        location_id: payload.locationId ? Number(payload.locationId) : null,
        updated_at: sql`NOW()`,
      }).where('id', '=', purchaseId).execute();
    });

    await this.audit.log('تعديل فاتورة شراء', `تم تعديل فاتورة شراء #${purchaseId} بواسطة ${auth.username}`, auth.userId);
    const purchase = (await this.mapPurchases()).find((entry) => Number(entry.id) === purchaseId) || null;
    return { ok: true, purchase, purchases: (await this.listPurchases({}, auth)).purchases };
  }

  async cancelPurchase(purchaseId: number, reason: string, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Purchase already cancelled', 'PURCHASE_ALREADY_CANCELLED', 400);

      const items = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).execute();
      for (const item of items) {
        if (!item.product_id) continue;
        const product = await trx.selectFrom('products').select(['stock_qty']).where('id', '=', item.product_id).executeTakeFirst();
        if (!product) continue;
        const removeQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const beforeQty = Number(product.stock_qty || 0);
        if (beforeQty < removeQty) throw new AppError(`Cannot cancel purchase because stock would go negative for product #${item.product_id}`, 'PURCHASE_CANCEL_STOCK_INVALID', 400);
        const afterQty = Number((beforeQty - removeQty).toFixed(3));
        await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', item.product_id).execute();
        await trx.insertInto('stock_movements').values({
          product_id: item.product_id,
          movement_type: 'purchase_cancel',
          qty: -removeQty,
          before_qty: beforeQty,
          after_qty: afterQty,
          reason: 'purchase_cancel',
          note: `Cancel ${purchase.doc_no || purchase.id}`,
          reference_type: 'purchase',
          reference_id: purchaseId,
          branch_id: purchase.branch_id,
          location_id: purchase.location_id,
          created_by: auth.userId,
        }).execute();
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        await this.addSupplierLedgerEntry(trx, purchase.supplier_id, -Number(purchase.total || 0), 'purchase_cancel', `إلغاء فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      } else {
        await this.addTreasuryTransaction(trx, 'purchase_cancel', Number(purchase.total || 0), `إلغاء فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      }

      await trx.updateTable('purchases').set({
        status: 'cancelled',
        cancel_reason: String(reason || '').trim(),
        cancelled_by: auth.userId,
        cancelled_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      }).where('id', '=', purchaseId).execute();
    });

    await this.audit.log('إلغاء فاتورة شراء', `تم إلغاء فاتورة شراء #${purchaseId} بواسطة ${auth.username}`, auth.userId);
    const purchase = (await this.mapPurchases()).find((entry) => Number(entry.id) === purchaseId) || null;
    return { ok: true, purchase, purchases: (await this.listPurchases({}, auth)).purchases };
  }

  async listSupplierPayments(_auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('supplier_payments as sp')
      .leftJoin('branches as b', 'b.id', 'sp.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'sp.location_id')
      .leftJoin('users as u', 'u.id', 'sp.created_by')
      .select(['sp.id', 'sp.doc_no', 'sp.supplier_id', 'sp.amount', 'sp.note', 'sp.payment_date', 'sp.branch_id', 'sp.location_id', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .orderBy('sp.id desc')
      .execute();

    return {
      supplierPayments: rows.map((row) => ({
        id: String(row.id),
        docNo: row.doc_no || `PO-${row.id}`,
        supplierId: String(row.supplier_id),
        amount: Number(row.amount || 0),
        note: row.note || '',
        date: row.payment_date,
        createdBy: row.created_by_name || '',
        branchId: row.branch_id ? String(row.branch_id) : '',
        locationId: row.location_id ? String(row.location_id) : '',
        branchName: row.branch_name || '',
        locationName: row.location_name || '',
      })),
    };
  }

  async createSupplierPayment(payload: CreateSupplierPaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const paymentId = await this.tx.runInTransaction(this.db, async (trx) => {
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name', 'balance']).where('id', '=', payload.supplierId).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      const amount = Number(payload.amount || 0);
      if (!(amount > 0)) throw new AppError('Amount must be greater than zero', 'INVALID_AMOUNT', 400);
      const currentBalance = Number(supplier.balance || 0);
      if (!(currentBalance > 0)) throw new AppError('Supplier has no outstanding balance', 'SUPPLIER_NO_BALANCE', 400);
      if (amount > currentBalance + 0.0001) throw new AppError('Supplier payment cannot exceed outstanding balance', 'SUPPLIER_OVERPAYMENT', 400);

      const insert = await trx
        .insertInto('supplier_payments')
        .values({
          supplier_id: supplier.id,
          amount,
          note: String(payload.note || '').trim(),
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_id: payload.locationId ? Number(payload.locationId) : null,
          created_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(insert.id);
      await trx.updateTable('supplier_payments').set({ doc_no: `PO-${id}` }).where('id', '=', id).execute();
      await this.addSupplierLedgerEntry(trx, supplier.id, -amount, 'supplier_payment', `دفع إلى ${supplier.name}${payload.note ? ` - ${payload.note}` : ''}`, 'supplier_payment', id, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      await this.addTreasuryTransaction(trx, 'supplier_payment', -amount, `دفع إلى ${supplier.name}`, 'supplier_payment', id, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      return id;
    });

    await this.audit.log('دفع لمورد', `تم تسجيل دفع لمورد PO-${paymentId} بواسطة ${auth.username}`, auth.userId);
    return { ok: true, supplierPayments: (await this.listSupplierPayments(auth)).supplierPayments };
  }

  async createCustomerPayment(payload: CreateCustomerPaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const customer = await trx.selectFrom('customers').select(['id', 'name', 'balance']).where('id', '=', payload.customerId).where('is_active', '=', true).executeTakeFirst();
      if (!customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
      const amount = Number(payload.amount || 0);
      if (!(amount > 0)) throw new AppError('Amount must be greater than zero', 'INVALID_AMOUNT', 400);
      const currentBalance = Number(customer.balance || 0);
      if (!(currentBalance > 0)) throw new AppError('Customer has no outstanding balance', 'CUSTOMER_NO_BALANCE', 400);
      if (amount > currentBalance + 0.0001) throw new AppError('Customer payment cannot exceed outstanding balance', 'CUSTOMER_OVERPAYMENT', 400);

      const insert = await trx
        .insertInto('customer_payments')
        .values({
          customer_id: customer.id,
          amount,
          note: String(payload.note || '').trim(),
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_id: payload.locationId ? Number(payload.locationId) : null,
          created_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const paymentId = Number(insert.id);
      await this.addCustomerLedgerEntry(trx, customer.id, -amount, `تحصيل من العميل ${customer.name}${payload.note ? ` - ${payload.note}` : ''}`, 'customer_payment', paymentId, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
      await this.addTreasuryTransaction(trx, 'customer_payment', amount, `تحصيل من العميل ${customer.name}${payload.note ? ` - ${payload.note}` : ''}`, 'customer_payment', paymentId, auth, payload.branchId ? Number(payload.branchId) : null, payload.locationId ? Number(payload.locationId) : null);
    });

    await this.audit.log('تحصيل عميل', `تم تسجيل تحصيل عميل بواسطة ${auth.username}`, auth.userId);
    return { ok: true };
  }
}
