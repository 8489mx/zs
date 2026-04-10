import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { computeInvoiceTotals } from '../../../common/utils/invoice-totals';
import { ensureNonNegativeStock, ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewConsumableStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from '../dto/create-party-payment.dto';
import { UpsertPurchaseDto } from '../dto/upsert-purchase.dto';
import { buildHistoricCostMap, buildNormalizedPurchaseItem, buildPurchaseReferenceNote, calculatePurchaseStockDecrease, calculatePurchaseStockIncrease, calculatePurchaseSubtotal, ensureAmountWithinOutstanding, normalizeOptionalNote, normalizePositiveAmount, normalizePurchaseScope } from '../helpers/purchases-write.helper';
import { PurchasesFinanceService } from './purchases-finance.service';
import { PurchasesQueryService } from './purchases-query.service';

@Injectable()
export class PurchasesWriteService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly financeService: PurchasesFinanceService,
    private readonly queryService: PurchasesQueryService,
  ) {}

  private hasPermission(auth: AuthContext, permission: string): boolean {
    return auth.role === 'super_admin' || auth.permissions.includes(permission);
  }

  async createPurchase(payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const purchaseId = await this.tx.runInTransaction(this.db, async (trx) => {
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', payload.supplierId).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

      const items = payload.items || [];
      if (!items.length) throw new AppError('Purchase must include at least one item', 'PURCHASE_ITEMS_REQUIRED', 400);
      ensureUniqueFlowItems(items, 'PURCHASE_DUPLICATE_PRODUCT', 'Purchase must not contain duplicate product rows with the same unit');

      const normalizedItems = [];
      for (const item of items) {
        const product = await trx.selectFrom('products').select(['id', 'name']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        normalizedItems.push(buildNormalizedPurchaseItem(item, product));
      }

      const subtotal = calculatePurchaseSubtotal(normalizedItems);
      const discount = Number(payload.discount || 0);
      if (!this.hasPermission(auth, 'canDiscount') && Math.abs(discount) > 0.0001) {
        throw new AppError('Discount change is not allowed', 'DISCOUNT_NOT_ALLOWED', 403);
      }
      if (discount < 0 || discount > subtotal) throw new AppError('Discount is invalid', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = computeInvoiceTotals(subtotal, discount, Number(payload.taxRate || 0), Boolean(payload.pricesIncludeTax));
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
      const { branchId, locationId } = normalizePurchaseScope(payload);

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
          note: normalizeOptionalNote(payload.note),
          status: 'posted',
          branch_id: branchId,
          location_id: locationId,
          created_by: auth.userId,
          cancel_reason: '',
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(insert.id);
      await trx.updateTable('purchases').set({ doc_no: `PUR-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).execute();

      for (const item of normalizedItems) {
        await trx.insertInto('purchase_items').values({
          purchase_id: id,
          product_id: item.productId,
          product_name: item.name,
          qty: item.qty,
          unit_cost: item.cost,
          line_total: item.total,
          unit_name: item.unitName,
          unit_multiplier: item.unitMultiplier,
        }).execute();

        const { increasedQty } = calculatePurchaseStockIncrease(item.qty, item.unitMultiplier, 0);
        const stockChange = await applyStockDelta(trx, {
          productId: item.productId,
          delta: increasedQty,
          branchId,
          locationId,
        });
        await trx.updateTable('products').set({ cost_price: item.cost, updated_at: sql`NOW()` }).where('id', '=', item.productId).execute();
        await trx.insertInto('stock_movements').values({
          product_id: item.productId,
          movement_type: 'purchase',
          qty: increasedQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'purchase',
          note: `فاتورة شراء PUR-${id}`,
          reference_type: 'purchase',
          reference_id: id,
          branch_id: branchId,
          location_id: locationId,
          created_by: auth.userId,
        }).execute();
      }

      if (paymentType === 'credit') {
        await this.financeService.addSupplierLedgerEntry(trx, supplier.id, total, 'purchase_credit', `فاتورة شراء PUR-${id}`, 'purchase', id, auth, branchId, locationId);
      } else {
        await this.financeService.addTreasuryTransaction(trx, 'purchase', -total, `فاتورة شراء PUR-${id}`, 'purchase', id, auth, branchId, locationId);
      }

      return id;
    });

    await this.audit.log('شراء', `تم تسجيل فاتورة شراء PUR-${purchaseId} بواسطة ${auth.username}`, auth.userId);
    const purchase = (await this.queryService.fetchMappedPurchases()).find((entry) => Number(entry.id) === purchaseId) || null;
    const purchases = await this.queryService.listPurchases({}, auth);
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
        const availableQty = await previewConsumableStockQty(trx, { productId: Number(item.product_id), branchId: purchase.branch_id, locationId: purchase.location_id });
        const { removedQty: removeQty, beforeQty } = calculatePurchaseStockDecrease(item.qty, item.unit_multiplier, availableQty);
        if (beforeQty < removeQty) throw new AppError(`Cannot edit purchase because stock would go negative for product #${item.product_id}`, 'PURCHASE_EDIT_STOCK_INVALID', 400);
      }

      for (const item of oldItems) {
        if (!item.product_id) continue;
        const availableQty = await previewConsumableStockQty(trx, { productId: Number(item.product_id), branchId: purchase.branch_id, locationId: purchase.location_id });
        const { removedQty: removeQty, afterQty } = calculatePurchaseStockDecrease(item.qty, item.unit_multiplier, availableQty);
        ensureNonNegativeStock(afterQty, 'PURCHASE_EDIT_STOCK_INVALID', `Cannot edit purchase because stock would go negative for product #${item.product_id}`);
        const stockChange = await applyStockDelta(trx, {
          productId: Number(item.product_id),
          delta: -removeQty,
          branchId: purchase.branch_id,
          locationId: purchase.location_id,
          errorCode: 'PURCHASE_EDIT_STOCK_INVALID',
          errorMessage: `Cannot edit purchase because stock would go negative for product #${item.product_id}`,
        });
        await trx.insertInto('stock_movements').values({
          product_id: item.product_id,
          movement_type: 'purchase_edit_restore',
          qty: -removeQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'purchase_edit_restore',
          note: buildPurchaseReferenceNote('Edit restore', purchase),
          reference_type: 'purchase',
          reference_id: purchaseId,
          branch_id: purchase.branch_id,
          location_id: purchase.location_id,
          created_by: auth.userId,
        }).execute();
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        await this.financeService.addSupplierLedgerEntry(trx, purchase.supplier_id, -Number(purchase.total || 0), 'purchase_edit_restore', `${buildPurchaseReferenceNote('عكس فاتورة شراء', purchase)} قبل التعديل`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      } else {
        await this.financeService.addTreasuryTransaction(trx, 'purchase_edit_restore', Number(purchase.total || 0), `${buildPurchaseReferenceNote('عكس فاتورة شراء', purchase)} قبل التعديل`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      }

      await trx.deleteFrom('purchase_items').where('purchase_id', '=', purchaseId).execute();

      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', payload.supplierId).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      const oldByProduct = buildHistoricCostMap(oldItems);
      const { branchId, locationId } = normalizePurchaseScope(payload);

      let subtotal = 0;
      for (const item of payload.items || []) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const incomingCost = Number(item.cost || 0);
        const originalCost = oldByProduct.has(Number(item.productId)) ? Number(oldByProduct.get(Number(item.productId)) || 0) : incomingCost;
        if (Math.abs(incomingCost - originalCost) > 0.0001 && !this.hasPermission(auth, 'canEditPrice')) {
          throw new AppError(`Cost edit is not allowed for ${product.name}`, 'COST_EDIT_NOT_ALLOWED', 403);
        }
        const normalizedItem = buildNormalizedPurchaseItem({ ...item, cost: incomingCost }, product);
        subtotal += normalizedItem.total;

        await trx.insertInto('purchase_items').values({
          purchase_id: purchaseId,
          product_id: normalizedItem.productId,
          product_name: normalizedItem.name,
          qty: normalizedItem.qty,
          unit_cost: normalizedItem.cost,
          line_total: normalizedItem.total,
          unit_name: normalizedItem.unitName,
          unit_multiplier: normalizedItem.unitMultiplier,
        }).execute();

        const { increasedQty: increaseQty } = calculatePurchaseStockIncrease(normalizedItem.qty, normalizedItem.unitMultiplier, 0);
        const stockChange = await applyStockDelta(trx, {
          productId: item.productId,
          delta: increaseQty,
          branchId,
          locationId,
        });
        await trx.updateTable('products').set({ cost_price: incomingCost, updated_at: sql`NOW()` }).where('id', '=', item.productId).execute();
        await trx.insertInto('stock_movements').values({
          product_id: item.productId,
          movement_type: 'purchase_edit_apply',
          qty: increaseQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'purchase_edit_apply',
          note: buildPurchaseReferenceNote('Edit apply', purchase),
          reference_type: 'purchase',
          reference_id: purchaseId,
          branch_id: branchId,
          location_id: locationId,
          created_by: auth.userId,
        }).execute();
      }

      const discount = Number(payload.discount || 0);
      if (!this.hasPermission(auth, 'canDiscount') && Math.abs(discount - Number(purchase.discount || 0)) > 0.0001) {
        throw new AppError('Discount change is not allowed', 'DISCOUNT_NOT_ALLOWED', 403);
      }
      if (discount < 0 || discount > subtotal) throw new AppError('Discount is invalid', 'INVALID_DISCOUNT', 400);
      const totals = computeInvoiceTotals(subtotal, discount, Number(payload.taxRate || 0), Boolean(payload.pricesIncludeTax));
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';

      if (paymentType === 'credit') {
        await this.financeService.addSupplierLedgerEntry(trx, supplier.id, totals.total, 'purchase_edit_apply', buildPurchaseReferenceNote('تطبيق تعديل فاتورة شراء', purchase), 'purchase', purchaseId, auth, branchId, locationId);
      } else {
        await this.financeService.addTreasuryTransaction(trx, 'purchase_edit_apply', -totals.total, buildPurchaseReferenceNote('تطبيق تعديل فاتورة شراء', purchase), 'purchase', purchaseId, auth, branchId, locationId);
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
        branch_id: branchId,
        location_id: locationId,
        updated_at: sql`NOW()`,
      }).where('id', '=', purchaseId).execute();
    });

    await this.audit.log('تعديل فاتورة شراء', `تم تعديل فاتورة شراء #${purchaseId} بواسطة ${auth.username}`, auth.userId);
    const purchase = (await this.queryService.fetchMappedPurchases()).find((entry) => Number(entry.id) === purchaseId) || null;
    return { ok: true, purchase, purchases: (await this.queryService.listPurchases({}, auth)).purchases };
  }

  async cancelPurchase(purchaseId: number, reason: string, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Purchase already cancelled', 'PURCHASE_ALREADY_CANCELLED', 400);

      const items = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).execute();
      for (const item of items) {
        if (!item.product_id) continue;
        const availableQty = await previewConsumableStockQty(trx, { productId: Number(item.product_id), branchId: purchase.branch_id, locationId: purchase.location_id });
        const { removedQty: removeQty, beforeQty, afterQty } = calculatePurchaseStockDecrease(item.qty, item.unit_multiplier, availableQty);
        if (beforeQty < removeQty) throw new AppError(`Cannot cancel purchase because stock would go negative for product #${item.product_id}`, 'PURCHASE_CANCEL_STOCK_INVALID', 400);
        ensureNonNegativeStock(afterQty, 'PURCHASE_EDIT_STOCK_INVALID', `Cannot edit purchase because stock would go negative for product #${item.product_id}`);
        const stockChange = await applyStockDelta(trx, {
          productId: Number(item.product_id),
          delta: -removeQty,
          branchId: purchase.branch_id,
          locationId: purchase.location_id,
          errorCode: 'PURCHASE_CANCEL_STOCK_INVALID',
          errorMessage: `Cannot cancel purchase because stock would go negative for product #${item.product_id}`,
        });
        await trx.insertInto('stock_movements').values({
          product_id: item.product_id,
          movement_type: 'purchase_cancel',
          qty: -removeQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'purchase_cancel',
          note: buildPurchaseReferenceNote('Cancel', purchase),
          reference_type: 'purchase',
          reference_id: purchaseId,
          branch_id: purchase.branch_id,
          location_id: purchase.location_id,
          created_by: auth.userId,
        }).execute();
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        await this.financeService.addSupplierLedgerEntry(trx, purchase.supplier_id, -Number(purchase.total || 0), 'purchase_cancel', buildPurchaseReferenceNote('إلغاء فاتورة شراء', purchase), 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      } else {
        await this.financeService.addTreasuryTransaction(trx, 'purchase_cancel', Number(purchase.total || 0), buildPurchaseReferenceNote('إلغاء فاتورة شراء', purchase), 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
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
    const purchase = (await this.queryService.fetchMappedPurchases()).find((entry) => Number(entry.id) === purchaseId) || null;
    return { ok: true, purchase, purchases: (await this.queryService.listPurchases({}, auth)).purchases };
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
      const { branchId, locationId } = normalizePurchaseScope(payload);

      const insert = await trx
        .insertInto('supplier_payments')
        .values({
          supplier_id: supplier.id,
          amount,
          note: normalizeOptionalNote(payload.note),
          branch_id: branchId,
          location_id: locationId,
          created_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(insert.id);
      await trx.updateTable('supplier_payments').set({ doc_no: `PO-${id}` }).where('id', '=', id).execute();
      const paymentNote = normalizeOptionalNote(payload.note);
      await this.financeService.addSupplierLedgerEntry(trx, supplier.id, -amount, 'supplier_payment', `دفع إلى ${supplier.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'supplier_payment', id, auth, branchId, locationId);
      await this.financeService.addTreasuryTransaction(trx, 'supplier_payment', -amount, `دفع إلى ${supplier.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'supplier_payment', id, auth, branchId, locationId);
      return id;
    });

    await this.audit.log('دفع لمورد', `تم تسجيل دفع لمورد PO-${paymentId} بواسطة ${auth.username}`, auth.userId);
    return { ok: true, supplierPayments: (await this.queryService.listSupplierPayments(auth)).supplierPayments };
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
      const { branchId, locationId } = normalizePurchaseScope(payload);

      const insert = await trx
        .insertInto('customer_payments')
        .values({
          customer_id: customer.id,
          amount,
          note: normalizeOptionalNote(payload.note),
          branch_id: branchId,
          location_id: locationId,
          created_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const paymentId = Number(insert.id);
      const paymentNote = normalizeOptionalNote(payload.note);
      await this.financeService.addCustomerLedgerEntry(trx, customer.id, -amount, `تحصيل من العميل ${customer.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'customer_payment', paymentId, auth, branchId, locationId);
      await this.financeService.addTreasuryTransaction(trx, 'customer_payment', amount, `تحصيل من العميل ${customer.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'customer_payment', paymentId, auth, branchId, locationId);
    });

    await this.audit.log('تحصيل عميل', `تم تسجيل تحصيل عميل بواسطة ${auth.username}`, auth.userId);
    return { ok: true };
  }
}
