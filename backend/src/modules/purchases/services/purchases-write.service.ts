import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql, type Selectable } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { computeInvoiceTotals } from '../../../common/utils/invoice-totals';
import { ensureNonNegativeStock, ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewConsumableStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from '../dto/create-party-payment.dto';
import { UpsertPurchaseDto } from '../dto/upsert-purchase.dto';
import { allocatePurchaseInvoiceDiscount, buildHistoricCostMap, buildNormalizedPurchaseItem, buildPurchaseReferenceNote, calculatePurchaseStockDecrease, calculatePurchaseStockIncrease, calculatePurchaseSubtotal, normalizeOptionalNote, normalizePurchaseScope } from '../helpers/purchases-write.helper';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { PurchasesFinanceService } from './purchases-finance.service';
import { PurchasesQueryService } from './purchases-query.service';

type PurchaseRepricingCandidate = {
  productId: number;
  name: string;
  itemKind: 'standard' | 'fashion';
  styleCode: string;
  previousCost: number;
  newCost: number;
  retailPrice: number;
  wholesalePrice: number;
};

type PurchaseRepricingProduct = Pick<Selectable<Database['products']>, 'id' | 'name' | 'item_kind' | 'style_code' | 'cost_price' | 'retail_price' | 'wholesale_price'>;

type PurchaseRepricingInsights = {
  purchaseId: number;
  supplierId: number;
  supplierName: string;
  affectedCount: number;
  increasedCount: number;
  decreasedCount: number;
  unchangedCount: number;
  productIds: number[];
  rows: Array<{
    productId: number;
    name: string;
    itemKind: 'standard' | 'fashion';
    styleCode: string;
    previousCost: number;
    newCost: number;
    costChangePercent: number;
    retailPrice: number;
    wholesalePrice: number;
    recommendedRetailPrice: number;
    recommendedWholesalePrice: number;
    recommendedRetailDelta: number;
    recommendedWholesaleDelta: number;
  }>;
};

@Injectable()
export class PurchasesWriteService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly financeService: PurchasesFinanceService,
    private readonly queryService: PurchasesQueryService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  private hasPermission(auth: AuthContext, permission: string): boolean {
    return auth.role === 'super_admin' || auth.permissions.includes(permission);
  }

  private roundCurrency(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private buildRecommendedSellPrice(currentSellPrice: number, previousCost: number, newCost: number): number {
    const safeCurrentSell = Number(currentSellPrice || 0);
    const safePreviousCost = Number(previousCost || 0);
    const safeNewCost = Number(newCost || 0);
    if (safeCurrentSell <= 0) return 0;
    if (safePreviousCost > 0 && safeNewCost > 0) {
      return this.roundCurrency((safeCurrentSell / safePreviousCost) * safeNewCost);
    }
    if (safeNewCost > 0) {
      const absoluteMarkup = Math.max(0, safeCurrentSell - Math.max(0, safePreviousCost));
      return this.roundCurrency(safeNewCost + absoluteMarkup);
    }
    return this.roundCurrency(safeCurrentSell);
  }

  private buildPurchaseRepricingCandidate(product: PurchaseRepricingProduct, newCost: number): PurchaseRepricingCandidate {
    return {
      productId: Number(product.id),
      name: String(product.name || ''),
      itemKind: product.item_kind === 'fashion' ? 'fashion' : 'standard',
      styleCode: String(product.style_code || ''),
      previousCost: Number(product.cost_price || 0),
      newCost,
      retailPrice: Number(product.retail_price || 0),
      wholesalePrice: Number(product.wholesale_price || 0),
    };
  }

  private buildPurchaseRepricingInsights(
    purchaseId: number,
    supplier: { id: number; name: string },
    candidates: PurchaseRepricingCandidate[],
  ): PurchaseRepricingInsights | null {
    const rows = candidates
      .filter((candidate) => Math.abs(Number(candidate.newCost || 0) - Number(candidate.previousCost || 0)) > 0.0001)
      .map((candidate) => {
        const previousCost = Number(candidate.previousCost || 0);
        const newCost = Number(candidate.newCost || 0);
        const retailPrice = Number(candidate.retailPrice || 0);
        const wholesalePrice = Number(candidate.wholesalePrice || 0);
        const recommendedRetailPrice = this.buildRecommendedSellPrice(retailPrice, previousCost, newCost);
        const recommendedWholesalePrice = this.buildRecommendedSellPrice(wholesalePrice, previousCost, newCost);
        const costChangePercent = previousCost > 0
          ? this.roundCurrency(((newCost - previousCost) / previousCost) * 100)
          : (newCost > 0 ? 100 : 0);
        return {
          productId: Number(candidate.productId),
          name: candidate.name,
          itemKind: candidate.itemKind,
          styleCode: candidate.styleCode,
          previousCost: this.roundCurrency(previousCost),
          newCost: this.roundCurrency(newCost),
          costChangePercent,
          retailPrice: this.roundCurrency(retailPrice),
          wholesalePrice: this.roundCurrency(wholesalePrice),
          recommendedRetailPrice,
          recommendedWholesalePrice,
          recommendedRetailDelta: this.roundCurrency(recommendedRetailPrice - retailPrice),
          recommendedWholesaleDelta: this.roundCurrency(recommendedWholesalePrice - wholesalePrice),
        };
      });

    if (!rows.length) return null;

    return {
      purchaseId,
      supplierId: Number(supplier.id),
      supplierName: supplier.name,
      affectedCount: rows.length,
      increasedCount: rows.filter((row) => row.newCost > row.previousCost).length,
      decreasedCount: rows.filter((row) => row.newCost < row.previousCost).length,
      unchangedCount: Math.max(0, candidates.length - rows.length),
      productIds: rows.map((row) => row.productId),
      rows,
    };
  }

  private async buildPurchaseMutationResponse(
    purchaseId: number,
    auth: AuthContext,
    extras: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const purchase = (await this.queryService.fetchMappedPurchases(auth)).find((entry) => Number(entry.id) === purchaseId) || null;
    const purchases = await this.queryService.listPurchases({}, auth);
    return { ok: true, purchase, purchases: purchases.purchases, ...extras };
  }

  async createPurchase(payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const created = await this.tx.runInTransaction(this.db, async (trx) => {
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', payload.supplierId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

      const items = payload.items || [];
      if (!items.length) throw new AppError('Purchase must include at least one item', 'PURCHASE_ITEMS_REQUIRED', 400);
      ensureUniqueFlowItems(items, 'PURCHASE_DUPLICATE_PRODUCT', 'Purchase must not contain duplicate product rows with the same unit');

      const normalizedItems = [];
      const repricingCandidates: PurchaseRepricingCandidate[] = [];
      for (const item of items) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'item_kind', 'style_code', 'cost_price', 'retail_price', 'wholesale_price']).where('id', '=', item.productId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        normalizedItems.push(buildNormalizedPurchaseItem(item, product));
        repricingCandidates.push(this.buildPurchaseRepricingCandidate(product, Number(item.cost || 0)));
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
          required_date: payload.requiredDate || null,
          currency: payload.currency || '',
          company_name: payload.companyName || '',
          contact_id: payload.contactId || null,
          shipping_address_id: payload.shippingAddressId || null,
          cost_center_id: payload.costCenterId || null,
          project_id: payload.projectId || null,
          terms_template: payload.termsTemplate || '',
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(insert.id);
      await trx.updateTable('purchases').set({ doc_no: `PUR-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      const allocatedItems = allocatePurchaseInvoiceDiscount(normalizedItems, discount);
      for (const item of allocatedItems) {
        await trx.insertInto('purchase_items').values({
          purchase_id: id,
          product_id: item.productId,
          product_name: item.name,
          qty: item.qty,
          unit_cost: item.effectiveUnitCost,
          line_total: item.effectiveLineTotal,
          unit_name: item.unitName,
          unit_multiplier: item.unitMultiplier,
          category_id: item.categoryId ?? null,
          location_id: item.locationId ?? null,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();


        const { increasedQty } = calculatePurchaseStockIncrease(item.qty, item.unitMultiplier, 0);
        const stockChange = await applyStockDelta(trx, {
          productId: item.productId,
          delta: increasedQty,
          branchId,
          locationId,
          tenantId: scope.tenantId,
          accountId: scope.accountId,
        });

        const oldQty = Math.max(0, stockChange.globalBefore);
        const oldCost = item.oldCostPrice;
        const newCost = increasedQty > 0 
          ? ((oldQty * oldCost) + (increasedQty * item.effectiveUnitCost)) / Math.max(1, oldQty + increasedQty)
          : oldCost;

        await trx.updateTable('products')
          .set({ cost_price: Number(newCost.toFixed(6)), updated_at: sql`NOW()` })
          .where('id', '=', item.productId)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();
      }

      if (payload.attachments && payload.attachments.length > 0) {
        for (const attachment of payload.attachments) {
          await trx.insertInto('purchase_attachments').values({
            purchase_id: id,
            file_name: attachment.fileName,
            file_url: attachment.fileUrl,
            file_size: attachment.fileSize,
            file_type: attachment.fileType,
          } as any).execute();
        }
      }

      if (paymentType === 'credit') {
        await this.financeService.addSupplierLedgerEntry(trx, supplier.id, total, 'purchase_credit', `فاتورة شراء PUR-${id}`, 'purchase', id, auth, branchId, locationId);
      } else {
        await this.financeService.addTreasuryTransaction(trx, 'purchase', -total, `فاتورة شراء PUR-${id}`, 'purchase', id, auth, branchId, locationId);
      }

      await this.accountingPosting.postPurchase(trx, id, auth);

      return {
        purchaseId: id,
        repricingInsights: this.buildPurchaseRepricingInsights(id, { id: Number(supplier.id), name: String(supplier.name || '') }, repricingCandidates),
      };
    });

    await this.audit.log('شراء', `تم تسجيل فاتورة شراء PUR-${created.purchaseId} بواسطة ${auth.username}`, auth);
    return this.buildPurchaseMutationResponse(created.purchaseId, auth, { repricingInsights: created.repricingInsights });
  }

  async updatePurchase(purchaseId: number, payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const updated = await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Cancelled purchase cannot be edited', 'PURCHASE_CANCELLED', 400);

      const oldItems = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      if (!(payload.items || []).length) throw new AppError('Purchase must include at least one item', 'PURCHASE_ITEMS_REQUIRED', 400);
      if (!(Number(payload.supplierId || 0) > 0)) throw new AppError('Supplier is required', 'SUPPLIER_REQUIRED', 400);
      for (const item of oldItems) {
        if (!item.product_id) continue;
        const availableQty = await previewConsumableStockQty(trx, { productId: Number(item.product_id), branchId: purchase.branch_id, locationId: purchase.location_id, tenantId: scope.tenantId, accountId: scope.accountId });
        const { removedQty: removeQty, beforeQty } = calculatePurchaseStockDecrease(item.qty, item.unit_multiplier, availableQty);
        if (beforeQty < removeQty) throw new AppError(`Cannot edit purchase because stock would go negative for product #${item.product_id}`, 'PURCHASE_EDIT_STOCK_INVALID', 400);
      }

      for (const item of oldItems) {
        if (!item.product_id) continue;
        const availableQty = await previewConsumableStockQty(trx, { productId: Number(item.product_id), branchId: purchase.branch_id, locationId: purchase.location_id, tenantId: scope.tenantId, accountId: scope.accountId });
        const { removedQty: removeQty, afterQty } = calculatePurchaseStockDecrease(item.qty, item.unit_multiplier, availableQty);
        ensureNonNegativeStock(afterQty, 'PURCHASE_EDIT_STOCK_INVALID', `Cannot edit purchase because stock would go negative for product #${item.product_id}`);
        const stockChange = await applyStockDelta(trx, {
          productId: Number(item.product_id),
          delta: -removeQty,
          branchId: purchase.branch_id,
          locationId: purchase.location_id,
          tenantId: scope.tenantId,
          accountId: scope.accountId,
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        await this.financeService.addSupplierLedgerEntry(trx, purchase.supplier_id, -Number(purchase.total || 0), 'purchase_edit_restore', `${buildPurchaseReferenceNote('عكس فاتورة شراء', purchase)} قبل التعديل`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      } else {
        await this.financeService.addTreasuryTransaction(trx, 'purchase_edit_restore', Number(purchase.total || 0), `${buildPurchaseReferenceNote('عكس فاتورة شراء', purchase)} قبل التعديل`, 'purchase', purchaseId, auth, purchase.branch_id, purchase.location_id);
      }

      await trx.deleteFrom('purchase_items').where('purchase_id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', payload.supplierId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      const oldByProduct = buildHistoricCostMap(oldItems);
      const { branchId, locationId } = normalizePurchaseScope(payload);

      let subtotal = 0;
      const normalizedItems = [];
      const repricingCandidates: PurchaseRepricingCandidate[] = [];
      for (const item of payload.items || []) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty', 'item_kind', 'style_code', 'cost_price', 'retail_price', 'wholesale_price']).where('id', '=', item.productId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const incomingCost = Number(item.cost || 0);
        const originalCost = oldByProduct.has(Number(item.productId)) ? Number(oldByProduct.get(Number(item.productId)) || 0) : incomingCost;
        if (Math.abs(incomingCost - originalCost) > 0.0001 && !this.hasPermission(auth, 'canEditPrice')) {
          throw new AppError(`Cost edit is not allowed for ${product.name}`, 'COST_EDIT_NOT_ALLOWED', 403);
        }
        const normalizedItem = buildNormalizedPurchaseItem({ ...item, cost: incomingCost }, product);
        normalizedItems.push(normalizedItem);
        repricingCandidates.push(this.buildPurchaseRepricingCandidate(product, incomingCost));
        subtotal += normalizedItem.total;
      }

      const discount = Number(payload.discount || 0);
      if (!this.hasPermission(auth, 'canDiscount') && Math.abs(discount - Number(purchase.discount || 0)) > 0.0001) {
        throw new AppError('Discount change is not allowed', 'DISCOUNT_NOT_ALLOWED', 403);
      }
      if (discount < 0 || discount > subtotal) throw new AppError('Discount is invalid', 'INVALID_DISCOUNT', 400);
      const totals = computeInvoiceTotals(subtotal, discount, Number(payload.taxRate || 0), Boolean(payload.pricesIncludeTax));
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';

      const allocatedItems = allocatePurchaseInvoiceDiscount(normalizedItems, discount);
      for (const normalizedItem of allocatedItems) {
        const repricedCost = Number(normalizedItem.effectiveUnitCost || 0);

        await trx.insertInto('purchase_items').values({
          purchase_id: purchaseId,
          product_id: normalizedItem.productId,
          product_name: normalizedItem.name,
          qty: normalizedItem.qty,
          unit_cost: repricedCost,
          line_total: normalizedItem.effectiveLineTotal,
          unit_name: normalizedItem.unitName,
          unit_multiplier: normalizedItem.unitMultiplier,
          category_id: normalizedItem.categoryId ?? null,
          location_id: normalizedItem.locationId ?? null,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();

        const { increasedQty: increaseQty } = calculatePurchaseStockIncrease(normalizedItem.qty, normalizedItem.unitMultiplier, 0);
        const stockChange = await applyStockDelta(trx, {
          productId: normalizedItem.productId,
          delta: increaseQty,
          branchId,
          locationId,
          tenantId: scope.tenantId,
          accountId: scope.accountId,
        });

        const oldQty = Math.max(0, stockChange.globalBefore);
        const oldCost = normalizedItem.oldCostPrice;
        const newCost = increaseQty > 0 
          ? ((oldQty * oldCost) + (increaseQty * repricedCost)) / Math.max(1, oldQty + increaseQty)
          : oldCost;

        await trx.updateTable('products')
          .set({ cost_price: Number(newCost.toFixed(6)), updated_at: sql`NOW()` })
          .where('id', '=', normalizedItem.productId)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
        await trx.insertInto('stock_movements').values({
          product_id: normalizedItem.productId,
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();
      }

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
        required_date: payload.requiredDate || null,
        currency: payload.currency || '',
        company_name: payload.companyName || '',
        contact_id: payload.contactId || null,
        shipping_address_id: payload.shippingAddressId || null,
        cost_center_id: payload.costCenterId || null,
        project_id: payload.projectId || null,
        terms_template: payload.termsTemplate || '',
        updated_at: sql`NOW()`,
      }).where('id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      return {
        repricingInsights: this.buildPurchaseRepricingInsights(purchaseId, { id: Number(supplier.id), name: String(supplier.name || '') }, repricingCandidates),
      };
    });

    await this.audit.log('تعديل فاتورة شراء', `تم تعديل فاتورة شراء #${purchaseId} بواسطة ${auth.username}`, auth);
    return this.buildPurchaseMutationResponse(purchaseId, auth, { repricingInsights: updated.repricingInsights });
  }

  async cancelPurchase(purchaseId: number, reason: string, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Purchase already cancelled', 'PURCHASE_ALREADY_CANCELLED', 400);

      const items = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      for (const item of items) {
        if (!item.product_id) continue;
        const availableQty = await previewConsumableStockQty(trx, { productId: Number(item.product_id), branchId: purchase.branch_id, locationId: purchase.location_id, tenantId: scope.tenantId, accountId: scope.accountId });
        const { removedQty: removeQty, beforeQty, afterQty } = calculatePurchaseStockDecrease(item.qty, item.unit_multiplier, availableQty);
        if (beforeQty < removeQty) throw new AppError(`Cannot cancel purchase because stock would go negative for product #${item.product_id}`, 'PURCHASE_CANCEL_STOCK_INVALID', 400);
        ensureNonNegativeStock(afterQty, 'PURCHASE_EDIT_STOCK_INVALID', `Cannot edit purchase because stock would go negative for product #${item.product_id}`);
        const stockChange = await applyStockDelta(trx, {
          productId: Number(item.product_id),
          delta: -removeQty,
          branchId: purchase.branch_id,
          locationId: purchase.location_id,
          tenantId: scope.tenantId,
          accountId: scope.accountId,
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();
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
      }).where('id', '=', purchaseId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      await this.accountingPosting.reversePurchaseJournal(trx, purchaseId, String(reason || '').trim(), auth);
    });

    await this.audit.log('إلغاء فاتورة شراء', `تم إلغاء فاتورة شراء #${purchaseId} بواسطة ${auth.username}`, auth);
    return this.buildPurchaseMutationResponse(purchaseId, auth);
  }

  async createSupplierPayment(payload: CreateSupplierPaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const paymentId = await this.tx.runInTransaction(this.db, async (trx) => {
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name', 'balance']).where('id', '=', payload.supplierId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst();
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(insert.id);
      await trx.updateTable('supplier_payments').set({ doc_no: `PO-${id}` }).where('id', '=', id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      const paymentNote = normalizeOptionalNote(payload.note);
      await this.financeService.addSupplierLedgerEntry(trx, supplier.id, -amount, 'supplier_payment', `دفع إلى ${supplier.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'supplier_payment', id, auth, branchId, locationId);
      await this.financeService.addTreasuryTransaction(trx, 'supplier_payment', -amount, `دفع إلى ${supplier.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'supplier_payment', id, auth, branchId, locationId);
      await this.accountingPosting.postSupplierPayment(trx, id, auth);
      return id;
    });

    await this.audit.log('دفع لمورد', `تم تسجيل دفع لمورد PO-${paymentId} بواسطة ${auth.username}`, auth);
    return { ok: true, supplierPayments: (await this.queryService.listSupplierPayments(auth)).supplierPayments };
  }

  async createCustomerPayment(payload: CreateCustomerPaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const customer = await trx.selectFrom('customers').select(['id', 'name', 'balance']).where('id', '=', payload.customerId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst();
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const paymentId = Number(insert.id);
      const paymentNote = normalizeOptionalNote(payload.note);
      await this.financeService.addCustomerLedgerEntry(trx, customer.id, -amount, `تحصيل من العميل ${customer.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'customer_payment', paymentId, auth, branchId, locationId);
      await this.financeService.addTreasuryTransaction(trx, 'customer_payment', amount, `تحصيل من العميل ${customer.name}${paymentNote ? ` - ${paymentNote}` : ''}`, 'customer_payment', paymentId, auth, branchId, locationId);
      await this.accountingPosting.postCustomerPayment(trx, paymentId, auth);
    });

    await this.audit.log('تحصيل عميل', `تم تسجيل تحصيل عميل بواسطة ${auth.username}`, auth);
    return { ok: true };
  }
}
