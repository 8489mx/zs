import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Kysely, sql, type Transaction } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { computeInvoiceTotals } from '../../../common/utils/invoice-totals';
import { ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewConsumableStockQty, previewAssignedLocationStockQty } from '../../../common/utils/location-stock-ledger';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { HeldSaleDto } from '../dto/held-sale.dto';
import { PosAuditEventDto } from '../dto/pos-audit-event.dto';
import { UpsertSaleDto } from '../dto/upsert-sale.dto';
import { normalizeSalePayload } from '../helpers/sales-payload.helper';
import { buildPreparedSaleItem, calculateAllowedSaleUnitPrice, calculateCollectibleTotal, calculatePaidAmount, calculateRestoredStockQuantity, resolvePostedSalePaymentChannel, resolveSalePayments } from '../helpers/sales-write.helper';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { SalesAuthorizationService } from './sales-authorization.service';
import { SalesFinanceService } from './sales-finance.service';
import { SalesQueryService } from './sales-query.service';
import { IdempotencyService } from '../../../core/idempotency/idempotency.service';
import { idempotencyStorage } from '../../../core/idempotency/idempotency.context';
import { WhatsAppGatewayService } from '../../settings/services/whatsapp-gateway.service';

@Injectable()
export class SalesWriteService {
  private readonly logger = new Logger(SalesWriteService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly authz: SalesAuthorizationService,
    private readonly finance: SalesFinanceService,
    private readonly query: SalesQueryService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly idempotency: IdempotencyService,
    @Optional() private readonly whatsappService?: WhatsAppGatewayService,
  ) {}

  private shouldLogCheckoutTimings(): boolean {
    return String(process.env.CHECKOUT_TIMINGS || '').trim() === '1';
  }

  private async assertDiscountChangeAllowed(
    trx: Kysely<Database> | Transaction<Database>,
    auth: AuthContext,
    discount: number,
    managerPin?: string | null,
    subtotal?: number,
  ): Promise<void> {
    const discountVal = Math.abs(Number(discount || 0));
    if (discountVal <= 0.0001) return;

    let exceedsThreshold = false;
    try {
      const scope = requireTenantScope(auth);
      const settingsRows = await trx
        .selectFrom('settings')
        .select(['key', 'value'])
        .where('key', 'in', ['posMaxDiscountThresholdEnabled', 'posMaxDiscountThresholdType', 'posMaxDiscountThresholdValue'])
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute();

      const settingsMap = settingsRows.reduce<Record<string, any>>((acc, row) => {
        try { acc[row.key] = JSON.parse(row.value); } catch { acc[row.key] = row.value; }
        return acc;
      }, {});

      const isThresholdEnabled = settingsMap.posMaxDiscountThresholdEnabled === true || settingsMap.posMaxDiscountThresholdEnabled === 'true';
      const thresholdType = settingsMap.posMaxDiscountThresholdType || 'percentage';
      const thresholdValue = Number(settingsMap.posMaxDiscountThresholdValue || 0);

      if (isThresholdEnabled && thresholdValue > 0) {
        if (thresholdType === 'percentage') {
          const sub = Number(subtotal || 0);
          const pct = sub > 0 ? (discountVal / sub) * 100 : 0;
          exceedsThreshold = pct > thresholdValue;
        } else {
          exceedsThreshold = discountVal > thresholdValue;
        }
      }
    } catch {
      // fallback to permission check
    }

    const isSuperAdmin = this.authz.hasPermission(auth, '*');
    if (isSuperAdmin) return;

    if (!this.authz.hasPermission(auth, 'canDiscount') || exceedsThreshold) {
      await this.authz.authorizeDiscountOverride(String(managerPin || '').trim(), auth, trx);
    }
  }

  private assertUnitPriceChangeAllowed(auth: AuthContext, providedPrice: number, allowedPrice: number): void {
    if (Math.abs(Number(providedPrice || 0) - Number(allowedPrice || 0)) <= 0.0001) return;
    if (this.authz.hasPermission(auth, 'canEditPrice')) return;
    throw new AppError('Price changes require canEditPrice permission', 'PRICE_CHANGE_FORBIDDEN', 403);
  }

  private async getCurrentProductOffers(trx: Kysely<Database> | Transaction<Database>, productId: number, tenantId: string) {
    return trx
      .selectFrom('product_offers')
      .select(['offer_type', 'value', 'start_date', 'end_date', 'min_qty'])
      .where('product_id', '=', productId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('is_active', '=', true)
      .orderBy('id', 'desc')
      .execute();
  }

  private async getAllowNegativeStockSales(trx: Kysely<Database> | Transaction<Database>, tenantId: string): Promise<boolean> {
    const rows = await trx
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('key', 'in', ['allowNegativeStockSales', 'allowSellingBelowStock'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();

    return rows.some((row) => {
      try {
        return JSON.parse(String(row.value ?? 'false')) === true;
      } catch {
        return String(row.value || '').trim().toLowerCase() === 'true';
      }
    });
  }

  private async autoProduceShortfall(
    trx: Kysely<Database> | Transaction<Database>,
    items: { productId: number; requiredQty: number; availableQty: number; hasBOM?: boolean; bomId?: number; unitMultiplier?: number }[],
    saleId: number,
    branchId: number | null,
    locationId: number | null,
    scope: { tenantId: string; accountId: string },
    auth: AuthContext,
    visitedProductIds: Set<number> = new Set(),
    depth = 0,
  ) {
    if (depth > 6) {
      throw new AppError('تجاوز الحد الأقصى لعمق شجرة التركيبات التصنيعية المتداخلة', 'BOM_RECURSION_LIMIT', 400);
    }

    for (const item of items) {
      if (!item.hasBOM || !item.bomId) continue;
      if (visitedProductIds.has(item.productId)) {
        throw new AppError(`اكتشاف حلقة تكرار دائرية في تركيبة التصنيع للمنتج #${item.productId}`, 'CIRCULAR_BOM_DETECTED', 400);
      }
      const nextVisited = new Set(visitedProductIds);
      nextVisited.add(item.productId);

      const shortfall = item.requiredQty - item.availableQty;
      if (shortfall <= 0) continue;

      const qtyToProduce = shortfall;
      const baseShortfall = Number((qtyToProduce / (item.unitMultiplier || 1)).toFixed(3)); // we need to produce in base unit since BOM is per base unit
      
      const bom = await trx.selectFrom('manufacturing_boms')
        .select(['expected_cost', 'quantity'])
        .where('id', '=', item.bomId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst();
      if (!bom) continue;

      const bomQuantity = Number(bom.quantity || 1);
      const totalCost = Number((Number(bom.expected_cost) * (qtyToProduce / bomQuantity)).toFixed(3));
      const wo = await trx.insertInto('manufacturing_work_orders').values({
        bom_id: item.bomId,
        quantity_to_produce: baseShortfall,
        produced_quantity: baseShortfall,
        status: 'done',
        source_location_id: locationId,
        destination_location_id: locationId,
        total_cost: totalCost,
        note: `إنتاج تلقائي للمبيعات فاتورة S-${saleId}`,
        created_by: auth.userId,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      }).returning('id').executeTakeFirstOrThrow();
      
      const woId = Number(wo.id);

      const bomLines = await trx.selectFrom('manufacturing_bom_lines as l')
        .innerJoin('products as p', 'p.id', 'l.component_product_id')
        .select(['l.component_product_id', 'l.quantity', 'l.unit_multiplier', 'l.expected_cost', 'l.waste_percentage', 'p.name as component_name'])
        .where('l.bom_id', '=', item.bomId)
        .execute();

      for (const line of bomLines) {
        const wasteFactor = 1 / (1 - (Number(line.waste_percentage || 0) / 100));
        const lineMultiplier = Number(line.unit_multiplier || 1);
        const quantityConsumedInSelectedUnit = Number(line.quantity) * wasteFactor * (qtyToProduce / bomQuantity);
        const requiredMaterialQty = Number((quantityConsumedInSelectedUnit * lineMultiplier).toFixed(3));
        const lineTotalCost = Number((Number(line.expected_cost) * quantityConsumedInSelectedUnit).toFixed(3));

        // Recursive BOM check
        const componentStock = await previewAssignedLocationStockQty(trx, {
          tenantId: scope.tenantId,
          accountId: scope.accountId,
          productId: Number(line.component_product_id),
          branchId,
          locationId: locationId || 0
        });

        if (componentStock < requiredMaterialQty) {
           const subBom = await trx.selectFrom('manufacturing_boms')
            .select(['id', 'is_active'])
            .where('product_id', '=', Number(line.component_product_id))
            .where('is_active', '=', true)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .executeTakeFirst();
            
           if (subBom) {
              await this.autoProduceShortfall(trx, [{
                productId: Number(line.component_product_id),
                requiredQty: requiredMaterialQty,
                availableQty: componentStock,
                hasBOM: true,
                bomId: subBom.id,
                unitMultiplier: 1 // base units
              }], saleId, branchId, locationId, scope, auth, nextVisited, depth + 1);
           }
        }

        await trx.insertInto('manufacturing_wo_consumptions').values({
          work_order_id: woId,
          component_product_id: Number(line.component_product_id),
          quantity_consumed: requiredMaterialQty,
          unit_cost: Number(line.expected_cost),
          line_total: lineTotalCost,
        }).execute();

        const stockChange = await applyStockDelta(trx, {
          tenantId: scope.tenantId,
          accountId: scope.accountId,
          productId: Number(line.component_product_id),
          branchId,
          locationId,
          delta: -requiredMaterialQty,
          allowNegative: true,
        });

        await trx.insertInto('stock_movements').values({
          product_id: Number(line.component_product_id),
          movement_type: 'manufacturing_consumption',
          qty: -requiredMaterialQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'استهلاك تصنيع تلقائي',
          note: `أمر إنتاج تلقائي #${woId} لفاتورة S-${saleId}`,
          reference_type: 'manufacturing_work_order',
          reference_id: woId,
          branch_id: branchId,
          location_id: locationId,
          created_by: auth.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).execute();
      }

      const fgStockChange = await applyStockDelta(trx, {
        tenantId: scope.tenantId,
        accountId: scope.accountId,
        productId: item.productId,
        branchId,
        locationId,
        delta: baseShortfall,
      });

      await trx.insertInto('stock_movements').values({
        product_id: item.productId,
        movement_type: 'manufacturing_production',
        qty: baseShortfall,
        before_qty: fgStockChange.scopeBefore,
        after_qty: fgStockChange.scopeAfter,
        reason: 'إنتاج تام تلقائي',
        note: `أمر إنتاج تلقائي #${woId} لفاتورة S-${saleId}`,
        reference_type: 'manufacturing_work_order',
        reference_id: woId,
        branch_id: branchId,
        location_id: locationId,
        created_by: auth.userId,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      }).execute();

      const finishedProduct = await trx.selectFrom('products').select(['stock_qty', 'cost_price']).where('id', '=', item.productId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (finishedProduct) {
        const oldStock = Number(finishedProduct.stock_qty || 0);
        const oldCost = Number(finishedProduct.cost_price || 0);
        const newCost = oldStock >= 0 ? (oldStock * oldCost + totalCost) / (oldStock + baseShortfall) : totalCost / baseShortfall;
        await trx.updateTable('products')
          .set({ cost_price: newCost, updated_at: sql`NOW()` })
          .where('id', '=', item.productId)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
      }

      await this.accountingPosting.postManufacturingWorkOrder(trx, woId, auth);
    }
  }

  private async deductPharmacyBatchesFefo(
    trx: Kysely<Database> | Transaction<Database>,
    productId: number,
    requiredQty: number,
    scope: { tenantId: string; accountId: string },
    allowNegative: boolean,
  ): Promise<void> {
    try {
      const batches = await trx
        .selectFrom('pharmacy_batches')
        .selectAll()
        .where((eb) =>
          eb.or([
            eb('product_id', '=', productId),
            eb(
              'drug_id',
              'in',
              trx
                .selectFrom('pharmacy_drugs')
                .select('id')
                .where('product_id', '=', productId)
                .where(sql<boolean>`tenant_id = ${scope.tenantId}`),
            ),
          ]),
        )
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .where('status', '=', 'active')
        .where('quantity', '>', 0)
        .orderBy('expiry_date', 'asc')
        .orderBy('id', 'asc')
        .forUpdate()
        .execute();

      if (!batches.length) return;

      let remaining = requiredQty;
      const todayIso = new Date().toISOString().slice(0, 10);
      const currentMonthIso = todayIso.slice(0, 7);

      for (const batch of batches) {
        if (remaining <= 0) break;
        const exp = String(batch.expiry_date || '').trim();
        const isExpired = exp && (exp.length === 7 ? exp < currentMonthIso : exp < todayIso);
        if (isExpired && !allowNegative) {
          throw new AppError(
            `لا يمكن بيع الصنف: التشغيلة (${batch.batch_number}) منتهية الصلاحية بتاريخ (${batch.expiry_date})`,
            'EXPIRED_BATCH_SALE_FORBIDDEN',
            400,
          );
        }

        const batchQty = Number(batch.quantity || 0);
        const alloc = Math.min(batchQty, remaining);
        const newQty = Number((batchQty - alloc).toFixed(3));
        const nextStatus = newQty <= 0 ? 'depleted' : 'active';

        await trx
          .updateTable('pharmacy_batches')
          .set({
            quantity: newQty,
            status: nextStatus,
            updated_at: sql`NOW()`,
          } as any)
          .where('id', '=', Number(batch.id))
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();

        remaining = Number((remaining - alloc).toFixed(3));
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      // If pharmacy tables are not installed or schema mismatch, do not block general retail POS
      this.logger.warn(`Pharmacy batch deduction skipped for product #${productId}: ${err?.message}`);
    }
  }

  async authorizeDiscountOverride(secret: string, auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await this.authz.authorizeDiscountOverride(String(secret || '').trim(), auth, this.db);
    return { ok: true, authorized: true, mode: result.mode, authorizedByName: result.authorizedByName };
  }

  async logPosAuditEvent(payload: PosAuditEventDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (payload.eventType === 'cart_remove') {
      const detailsParts = [
        `تم حذف عنصر من السلة بواسطة ${auth.username}`,
        payload.productName ? `الصنف: ${payload.productName}` : '',
        payload.productId ? `#${payload.productId}` : '',
        payload.qty ? `الكمية: ${payload.qty}` : '',
        typeof payload.total === 'number' ? `الإجمالي بعد الحذف: ${payload.total}` : '',
        typeof payload.cartItemsCount === 'number' ? `عدد العناصر: ${payload.cartItemsCount}` : '',
        payload.note ? `ملاحظة: ${payload.note}` : '',
      ].filter(Boolean);
      await this.audit.log('حدث أمني - حذف عنصر من السلة', detailsParts.join(' | '), auth);
      return { ok: true };
    }

    const cancelDetailsParts = [
      `تم إلغاء/حذف فاتورة قبل الإرسال بواسطة ${auth.username}`,
      typeof payload.total === 'number' ? `الإجمالي: ${payload.total}` : '',
      typeof payload.cartItemsCount === 'number' ? `عدد العناصر: ${payload.cartItemsCount}` : '',
      payload.note ? `ملاحظة: ${payload.note}` : '',
    ].filter(Boolean);
    await this.audit.log('حدث أمني - إلغاء/حذف فاتورة', cancelDetailsParts.join(' | '), auth);
    return { ok: true };
  }

  async createSale(payload: UpsertSaleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const requestStartedAt = Date.now();

    // Idempotency: check for a previously committed result for this key
    const idemCtx = idempotencyStorage.getStore();
    if (idemCtx?.idempotencyKey) {
      const cached = await this.idempotency.check(idemCtx.idempotencyKey, scope);
      if (cached) {
        if (cached.response?.sale) return cached.response as Record<string, unknown>;
        if (cached.response?.saleId) {
          const sale = await this.query.getSaleById(Number(cached.response.saleId), auth);
          return { ok: true, sale: sale.sale };
        }
        return cached.response as Record<string, unknown>;
      }
    }

    const normalized = normalizeSalePayload(payload);
    if (!normalized.items.length) throw new AppError('Sale must include at least one item', 'SALE_ITEMS_REQUIRED', 400);
    ensureUniqueFlowItems(normalized.items, 'SALE_DUPLICATE_PRODUCT', 'Sale must not contain duplicate product rows with the same unit');

    const txStartedAt = Date.now();
    const saleId = await this.tx.runInTransaction(this.db, async (trx) => {
      if (normalized.discount < 0) throw new AppError('Discount cannot be negative', 'INVALID_DISCOUNT', 400);
      if (normalized.storeCreditUsed < 0) throw new AppError('Store credit cannot be negative', 'INVALID_STORE_CREDIT', 400);

      const customer = normalized.customerId
        ? await trx.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit', 'store_credit_balance', 'loyalty_points']).where('id', '=', normalized.customerId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst()
        : null;
      if (normalized.customerId && !customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
      if (normalized.paymentType === 'credit' && !customer) throw new AppError('Credit sale requires a customer', 'CUSTOMER_REQUIRED_FOR_CREDIT', 400);

      let branch: any = null;
      if (normalized.source === 'pos') {
        if (!normalized.branchId) {
          throw new AppError('يجب تحديد الفرع لعمليات البيع عبر الكاشير.', 'POS_BRANCH_REQUIRED', 400);
        }
        branch = await trx.selectFrom('branches').select(['default_stock_location_id', 'sales_stock_mode', 'allow_external_sales_stock']).where('id', '=', normalized.branchId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
        if (!branch?.default_stock_location_id) {
          throw new AppError('لا يوجد مخزون افتراضي نشط لهذا الفرع، يرجى تحديده من الإعدادات قبل البيع.', 'POS_DEFAULT_STOCK_REQUIRED', 400);
        }
        normalized.locationId = branch.default_stock_location_id;
      }

      let eligibleLocations = [{ id: normalized.locationId, branchId: normalized.branchId }];
      if (normalized.source === 'pos' && branch?.sales_stock_mode === 'all_operational_locations') {
        const allLocs = await trx.selectFrom('stock_locations')
          .select(['id', 'location_type', 'branch_id'])
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .where('is_active', '=', true)
          .where('location_type', 'not in', ['damaged', 'in_transit'])
          .execute();
          
        const defaultLocId = Number(branch.default_stock_location_id);
        const normBranchId = Number(normalized.branchId);
        
        const sortedLocs = allLocs.filter(l => {
           const lId = Number(l.id);
           const lBranchId = l.branch_id != null ? Number(l.branch_id) : null;
           
           if (lId === defaultLocId) return true;
           if (lBranchId === normBranchId) return true;
           if (l.location_type === 'internal_warehouse' && l.branch_id === null) return true;
           if (branch.allow_external_sales_stock && l.location_type === 'external_warehouse') return true;
           return false;
        }).sort((a, b) => {
           const aId = Number(a.id);
           const bId = Number(b.id);
           const aBranchId = a.branch_id != null ? Number(a.branch_id) : null;
           const bBranchId = b.branch_id != null ? Number(b.branch_id) : null;
           
           if (aId === defaultLocId) return -1;
           if (bId === defaultLocId) return 1;
           if (aBranchId === normBranchId && bBranchId !== normBranchId) return -1;
           if (aBranchId !== normBranchId && bBranchId === normBranchId) return 1;
           if (a.location_type === 'internal_warehouse' && b.location_type !== 'internal_warehouse') return -1;
           if (a.location_type !== 'internal_warehouse' && b.location_type === 'internal_warehouse') return 1;
           return 0;
        });
        
        eligibleLocations = sortedLocs.map(l => ({ id: Number(l.id), branchId: l.branch_id != null ? Number(l.branch_id) : null }));
      }

      const allowNegativeStockSales = await this.getAllowNegativeStockSales(trx, scope.tenantId);

      const productIds = Array.from(new Set(normalized.items.map((it) => it.productId)));
      const productRows = productIds.length > 0
        ? await trx.selectFrom('products as p')
            .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
            .select(['p.id', 'p.name', 'p.stock_qty', 'p.retail_price', 'p.wholesale_price', 'p.cost_price', 'p.item_type', 'b.id as bom_id'])
            .where('p.id', 'in', productIds)
            .where(sql<boolean>`p.tenant_id = ${scope.tenantId}`)
            .where('p.is_active', '=', true)
            .execute()
        : [];
      const productMap = new Map(productRows.map((p) => [Number(p.id), p]));

      const allOffers = productIds.length > 0
        ? await trx
            .selectFrom('product_offers')
            .select(['product_id', 'offer_type', 'value', 'start_date', 'end_date', 'min_qty'])
            .where('product_id', 'in', productIds)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .where('is_active', '=', true)
            .orderBy('id', 'desc')
            .execute()
        : [];
      const offersByProductId = new Map<number, typeof allOffers>();
      for (const off of allOffers) {
        const pId = Number(off.product_id);
        if (!offersByProductId.has(pId)) offersByProductId.set(pId, []);
        offersByProductId.get(pId)!.push(off);
      }

      const bomIds = productRows.map((p) => (p.bom_id ? Number(p.bom_id) : 0)).filter((id) => id > 0);
      const allBomLines = bomIds.length > 0
        ? await trx.selectFrom('manufacturing_bom_lines as l')
            .innerJoin('products as p', 'p.id', 'l.component_product_id')
            .select(['l.bom_id', 'p.name as component_name'])
            .where('l.bom_id', 'in', bomIds)
            .execute()
        : [];
      const bomNamesByBomId = new Map<number, string[]>();
      for (const bl of allBomLines) {
        const bId = Number(bl.bom_id);
        if (!bomNamesByBomId.has(bId)) bomNamesByBomId.set(bId, []);
        bomNamesByBomId.get(bId)!.push(String(bl.component_name || ''));
      }

      const allStockRows = normalized.locationId && productIds.length > 0
        ? await trx.selectFrom('product_location_stock')
            .select(['product_id', 'location_id', 'branch_id', 'qty'])
            .where('product_id', 'in', productIds)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .execute()
        : [];
      const stockRowsByProductId = new Map<number, typeof allStockRows>();
      for (const sr of allStockRows) {
        const pId = Number(sr.product_id);
        if (!stockRowsByProductId.has(pId)) stockRowsByProductId.set(pId, []);
        stockRowsByProductId.get(pId)!.push(sr);
      }

      let subtotal = 0;
      const preparedItems = [];
      const autoProduceItems = [];
      for (const item of normalized.items) {
        if (Number(item.price || 0) <= 0) {
          throw new AppError('Sale item price must be greater than zero', 'INVALID_SALE_PRICE', 400);
        }
        const product = productMap.get(item.productId);
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        
        const activeOffers = offersByProductId.get(item.productId) || [];
        const allowedUnitPrice = calculateAllowedSaleUnitPrice({
          retailPrice: product.retail_price,
          wholesalePrice: product.wholesale_price,
          priceType: item.priceType,
          offers: activeOffers,
          qty: item.qty,
          unitMultiplier: item.unitMultiplier,
        });
        this.assertUnitPriceChangeAllowed(auth, Number(item.price || 0), allowedUnitPrice);

        let availableStockQty = 0;
        const productStockRows = stockRowsByProductId.get(item.productId) || [];
        if (!normalized.locationId) {
          availableStockQty = Number(product.stock_qty || 0);
        } else if (eligibleLocations.length === 1) {
          const locRow = productStockRows.find((r) => Number(r.location_id) === Number(normalized.locationId));
          const unassignedRow = productStockRows.find((r) => r.location_id == null && r.branch_id == null);
          availableStockQty = Number((Number(locRow?.qty || 0) + Number(unassignedRow?.qty || 0)).toFixed(3));
        } else {
          // If all_operational_locations is enabled, sum the stock of all eligible locations + unassigned
          const locIds = eligibleLocations.map(l => l.id).filter(id => id != null);
          let totalEligible = 0;
          for (const row of productStockRows) {
            if (row.location_id == null && row.branch_id == null) {
              totalEligible += Number(row.qty || 0);
            } else if (row.location_id != null && locIds.includes(Number(row.location_id))) {
              totalEligible += Number(row.qty || 0);
            }
          }
          availableStockQty = Number(totalEligible.toFixed(3));
        }
          
        const hasBOM = !!product.bom_id;
        let finalProductName = product.name;

        if (hasBOM) {
          const bomLines = bomNamesByBomId.get(Number(product.bom_id)) || [];
          if (bomLines.length > 0) {
            finalProductName = `${product.name} (${bomLines.join(' + ')})`;
          }
        }

        const preparedItem = buildPreparedSaleItem(
          { ...product, name: finalProductName, stock_qty: availableStockQty }, 
          item, 
          { allowNegativeStockSales: allowNegativeStockSales || hasBOM || (product as any).item_type === 'service' }
        );
        subtotal += preparedItem.lineTotal;
        preparedItems.push({ ...preparedItem, isService: (product as any).item_type === 'service' });
        
        if (hasBOM) {
          autoProduceItems.push({
            productId: item.productId,
            requiredQty: preparedItem.requiredQty,
            availableQty: availableStockQty,
            hasBOM: true,
            bomId: Number(product.bom_id),
            unitMultiplier: item.unitMultiplier,
          });
        }
      }

      let effectiveDiscount = normalized.discount;
      let loyaltyDiscount = 0;
      let pointsAfterRedeem = Number((customer as any)?.loyalty_points || 0);

      if (normalized.loyaltyPointsRedeemed > 0 && customer) {
        const availablePoints = Number((customer as any)?.loyalty_points || 0);
        if (normalized.loyaltyPointsRedeemed > availablePoints + 0.001) {
          throw new AppError('رصيد نقاط الولاء غير كافٍ للاستبدال', 'INSUFFICIENT_LOYALTY_POINTS', 400);
        }
        loyaltyDiscount = Number(normalized.loyaltyPointsRedeemed.toFixed(2));
        effectiveDiscount = Number((effectiveDiscount + loyaltyDiscount).toFixed(2));
        pointsAfterRedeem = Math.max(0, Number((availablePoints - normalized.loyaltyPointsRedeemed).toFixed(2)));
      }

      await this.assertDiscountChangeAllowed(trx, auth, normalized.discount, normalized.managerPin, subtotal);
      if (effectiveDiscount > subtotal) throw new AppError('Discount cannot exceed subtotal', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = computeInvoiceTotals(subtotal, effectiveDiscount, normalized.taxRate, normalized.pricesIncludeTax, normalized.deliveryFee);
      if (normalized.storeCreditUsed > total + 0.0001) throw new AppError('Store credit cannot exceed invoice total', 'INVALID_STORE_CREDIT', 400);

      const collectibleTotal = calculateCollectibleTotal(total, normalized.storeCreditUsed);
      
      const requireCashierShiftForSales = await trx
        .selectFrom('settings')
        .select('value')
        .where('key', '=', 'requireCashierShiftForSales')
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst()
        .then((row) => {
          if (!row || !row.value) return true;
          try {
            return JSON.parse(row.value) !== false;
          } catch {
            return String(row.value).toLowerCase() !== 'false';
          }
        });

      if (normalized.source === 'pos' && requireCashierShiftForSales) {
        const hasOpenShift = await this.authz.hasOpenCashierShift(trx, auth);
        if (!hasOpenShift) throw new AppError('Open cashier shift is required before posting a POS sale', 'OPEN_SHIFT_REQUIRED', 400);
      } else if (normalized.paymentType !== 'credit' && !['admin', 'super_admin'].includes(auth.role) && (normalized.payments.some((entry) => entry.paymentChannel === 'cash') || normalized.paymentChannel === 'cash')) {
        const hasOpenShift = await this.authz.hasOpenCashierShift(trx, auth);
        if (!hasOpenShift) throw new AppError('Open cashier shift is required before posting a cash sale', 'OPEN_SHIFT_REQUIRED', 400);
      }

      const payments = resolveSalePayments(normalized.paymentType, normalized.payments, collectibleTotal, normalized.paymentChannel);
      const paidAmount = calculatePaidAmount(payments);
      const remainingDebt = Number(Math.max(0, collectibleTotal - paidAmount).toFixed(2));

      if (normalized.paymentType === 'credit' && customer) {
        const nextBalance = Number(customer.balance || 0) + remainingDebt;
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
      const isDelivery = String(normalized.orderType || '').trim() === 'delivery';
      let deliveryRepId: number | null = null;
      let deliveryStatus: string | null = null;
      let collectionStatus: string | null = null;
      let resolvedDeliveryFeeMode: 'freelance_courier' | 'store_fleet' = (payload as any).deliveryFeeMode === 'store_fleet' ? 'store_fleet' : ((payload as any).deliveryFeeMode === 'freelance_courier' ? 'freelance_courier' : (null as any));

      if (isDelivery) {
        const rawRepId = (payload as any).deliveryRepId;
        const parsedRepId = rawRepId ? Number(rawRepId) : 0;
        if (!parsedRepId || Number.isNaN(parsedRepId) || parsedRepId <= 0) {
          throw new AppError('يجب اختيار مندوب التوصيل لطلبات الدليفري لتسجيل عهدة التحصيل عليه', 'DELIVERY_REP_REQUIRED', 400);
        }
        const rep = await trx
          .selectFrom('delivery_representatives')
          .select(['id', 'name', 'rep_type', 'is_active'])
          .where('id', '=', parsedRepId)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .executeTakeFirst();
        if (!rep) {
          throw new AppError('مندوب التوصيل المختار غير موجود', 'DELIVERY_REP_NOT_FOUND', 400);
        }
        if (rep.is_active === false) {
          throw new AppError('مندوب التوصيل المختار غير نشط', 'DELIVERY_REP_INACTIVE', 400);
        }
        deliveryRepId = parsedRepId;
        deliveryStatus = (payload as any).deliveryStatus || 'pending';
        const hasUnpaidAmount = paidAmount + 0.0001 < collectibleTotal;
        collectionStatus = (payload as any).collectionStatus || (hasUnpaidAmount ? 'pending' : 'collected');
        if (!resolvedDeliveryFeeMode && rep.rep_type === 'store_fleet') {
          resolvedDeliveryFeeMode = 'store_fleet';
        }
      }

      const isCodDelivery = isDelivery && (collectionStatus === 'cod' || collectionStatus === 'pending' || paidAmount + 0.0001 < collectibleTotal);
      const isPartialCredit = Boolean(normalized.customerId) && paidAmount + 0.0001 < collectibleTotal;
      const effectivePaymentType = (isPartialCredit || normalized.paymentType === 'credit') ? 'credit' : 'cash';
      if (effectivePaymentType !== 'credit' && !isCodDelivery && paidAmount + 0.0001 < collectibleTotal) {
        throw new AppError('Paid amount cannot be less than invoice total', 'INVALID_PAID_AMOUNT', 400);
      }

      const appliedCash = payments.find((p) => p.paymentChannel === 'cash')?.amount || 0;
      let finalTenderedAmount = normalized.tenderedAmount > 0 ? normalized.tenderedAmount : appliedCash;
      if (finalTenderedAmount < appliedCash) {
        finalTenderedAmount = appliedCash;
      }
      const changeAmount = Number(Math.max(0, finalTenderedAmount - appliedCash).toFixed(2));

      if (!resolvedDeliveryFeeMode) {
        const settingRow = await trx.selectFrom('settings').select(['value']).where('key', '=', 'deliveryFeeMode').where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
        if (settingRow?.value && String(settingRow.value).includes('store_fleet')) {
          resolvedDeliveryFeeMode = 'store_fleet';
        } else {
          resolvedDeliveryFeeMode = 'freelance_courier';
        }
      }

      const saleInsert = await trx
        .insertInto('sales')
        .values({
          customer_id: normalized.customerId,
          customer_name: customer?.name || 'عميل نقدي',
          customer_phone: payload.customerPhone || null,
          customer_address: payload.customerAddress || null,
          payment_type: effectivePaymentType,
          payment_channel: resolvePostedSalePaymentChannel(effectivePaymentType, payments),
          subtotal: Number(subtotal.toFixed(2)),
          discount: effectiveDiscount,
          delivery_fee: normalized.deliveryFee,
          delivery_fee_mode: resolvedDeliveryFeeMode,
          tax_rate: normalized.taxRate,
          tax_amount: taxAmount,
          prices_include_tax: normalized.pricesIncludeTax,
          total,
          paid_amount: paidAmount,
          tendered_amount: finalTenderedAmount,
          change_amount: changeAmount,
          store_credit_used: normalized.storeCreditUsed,
          status: 'posted',
          note: normalized.note,
          branch_id: normalized.branchId,
          location_id: normalized.locationId,
          table_number: String(normalized.tableNumber || '').trim(),
          order_type: String(normalized.orderType || 'takeaway').trim(),
          delivery_rep_id: deliveryRepId,
          delivery_status: deliveryStatus,
          collection_status: collectionStatus,
          created_by: auth.userId,
          cancel_reason: '',
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(saleInsert.id);
      const docNo = await this.generateSaleDocNo(trx, id, scope.tenantId);
      await trx.updateTable('sales').set({ doc_no: docNo, updated_at: sql`NOW()` }).where('id', '=', id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      if (payments.length > 0) {
        await trx.insertInto('sale_payments').values(
          payments.map((payment) => ({
            sale_id: id,
            payment_channel: payment.paymentChannel,
            amount: payment.amount,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          }))
        ).execute();
      }

      await this.autoProduceShortfall(trx, autoProduceItems, id, normalized.branchId, normalized.locationId, scope, auth);

      for (const item of preparedItems) {
        const itemSerials = Array.isArray(item.serials) ? item.serials : [];
        const insertedLine = await trx
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
            notes: item.notes,
            modifiers: (item.originalPrice || item.offerDiscount || item.offerName)
              ? JSON.stringify({
                  mods: Array.isArray(item.modifiers) ? item.modifiers : [],
                  offer: {
                    originalPrice: item.originalPrice,
                    offerDiscount: item.offerDiscount,
                    offerName: item.offerName,
                  },
                })
              : (item.modifiers ? JSON.stringify(item.modifiers) : '[]'),
            serials: itemSerials.length > 0 ? JSON.stringify(itemSerials) : '[]',
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          } as any)
          .returning('id')
          .executeTakeFirstOrThrow();
        const saleLineId = Number(insertedLine.id);

        if (itemSerials.length > 0) {
          const cleanSerials = itemSerials.map((s: any) =>
            (typeof s === 'string' ? s : s?.serialNumber || s?.serial || '').trim().toLowerCase()
          ).filter(Boolean);

          if (cleanSerials.length > 0) {
            await trx
              .updateTable('product_serials')
              .set({
                status: 'sold',
                sale_id: id,
                sale_item_id: saleLineId,
                updated_at: sql`NOW()`,
              })
              .where('product_id', '=', item.productId)
              .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
              .where(sql<boolean>`LOWER(serial_number) in (${sql.join(cleanSerials)})`)
              .execute();
          }
        }

        if (item.isService) {
          continue;
        }

        let remainingQty = item.requiredQty;
        let allocationOrder = 1;
        const allocations = [];

        for (const loc of eligibleLocations) {
          if (remainingQty <= 0) break;
          const locStock = await trx.selectFrom('product_location_stock')
            .select('qty')
            .where('product_id', '=', item.productId)
            .where('location_id', '=', loc.id)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .forUpdate()
            .executeTakeFirst();
          
          const availableQty = Number(locStock?.qty || 0);
          if (availableQty > 0) {
            const allocateQty = Math.min(availableQty, remainingQty);
            remainingQty = Number((remainingQty - allocateQty).toFixed(3));
            allocations.push({ locationId: loc.id, branchId: loc.branchId, qty: allocateQty });
          }
        }

        if (remainingQty > 0) {
           if (!allowNegativeStockSales) {
              throw new AppError(`Insufficient stock for ${item.productName}`, 'INSUFFICIENT_STOCK', 400);
           }
           allocations.push({ locationId: normalized.locationId, branchId: normalized.branchId, qty: remainingQty });
           remainingQty = 0;
        }

        for (const alloc of allocations) {
          const stockChange = await applyStockDelta(trx, {
            productId: item.productId,
            delta: -alloc.qty,
            branchId: alloc.branchId,
            locationId: alloc.locationId,
            tenantId: scope.tenantId,
            accountId: scope.accountId,
            errorCode: 'INSUFFICIENT_STOCK',
            errorMessage: `Insufficient stock for ${item.productName}`,
            allowNegative: allowNegativeStockSales,
          });
          
          await trx
            .insertInto('stock_movements')
            .values({
              product_id: item.productId,
              movement_type: 'sale',
              qty: -alloc.qty,
              before_qty: stockChange.scopeBefore,
              after_qty: stockChange.scopeAfter,
              reason: 'sale',
              note: `Sale S-${id}`,
              reference_type: 'sale',
              reference_id: id,
              branch_id: alloc.branchId,
              location_id: alloc.locationId,
              created_by: auth.userId,
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
            } as any)
            .execute();

          await trx.insertInto('sale_line_stock_allocations').values({
             tenant_id: scope.tenantId,
             account_id: scope.accountId,
             sale_id: id,
             sale_line_id: saleLineId,
             product_id: item.productId,
             location_id: alloc.locationId as number,
             quantity: alloc.qty,
             allocation_order: allocationOrder++,
          }).execute();
        }

        await this.deductPharmacyBatchesFefo(trx, item.productId, item.requiredQty, scope, allowNegativeStockSales);

        if (item.modifiers && Array.isArray(item.modifiers)) {
          for (const mod of item.modifiers) {
            if (mod.productId) {
              const modifierQty = Number(mod.qty || 1) * Number(item.qty || 1);
              
              let modRemainingQty = modifierQty;
              let modAllocationOrder = 1;
              const modAllocations = [];

              for (const loc of eligibleLocations) {
                if (modRemainingQty <= 0) break;
                const locStock = await trx.selectFrom('product_location_stock')
                  .select('qty')
                  .where('product_id', '=', Number(mod.productId))
                  .where('location_id', '=', loc.id)
                  .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
                  .forUpdate()
                  .executeTakeFirst();
                
                const availableQty = Number(locStock?.qty || 0);
                if (availableQty > 0) {
                  const allocateQty = Math.min(availableQty, modRemainingQty);
                  modRemainingQty = Number((modRemainingQty - allocateQty).toFixed(3));
                  modAllocations.push({ locationId: loc.id, branchId: loc.branchId, qty: allocateQty });
                }
              }

              if (modRemainingQty > 0) {
                 if (!allowNegativeStockSales) {
                    throw new AppError(`Insufficient stock for modifier ${mod.name}`, 'INSUFFICIENT_MODIFIER_STOCK', 400);
                 }
                 modAllocations.push({ locationId: normalized.locationId, branchId: normalized.branchId, qty: modRemainingQty });
                 modRemainingQty = 0;
              }

              for (const alloc of modAllocations) {
                const modStockChange = await applyStockDelta(trx, {
                  productId: Number(mod.productId),
                  delta: -alloc.qty,
                  branchId: alloc.branchId,
                  locationId: alloc.locationId,
                  tenantId: scope.tenantId,
                  accountId: scope.accountId,
                  errorCode: 'INSUFFICIENT_MODIFIER_STOCK',
                  errorMessage: `Insufficient stock for modifier ${mod.name}`,
                  allowNegative: allowNegativeStockSales,
                });

                await trx
                  .insertInto('stock_movements')
                  .values({
                    product_id: Number(mod.productId),
                    movement_type: 'sale',
                    qty: -alloc.qty,
                    before_qty: modStockChange.scopeBefore,
                    after_qty: modStockChange.scopeAfter,
                    reason: 'sale_modifier',
                    note: `Sale S-${id} (${item.productName})`,
                    reference_type: 'sale',
                    reference_id: id,
                    branch_id: alloc.branchId,
                    location_id: alloc.locationId,
                    created_by: auth.userId,
                    tenant_id: scope.tenantId,
                    account_id: scope.accountId,
                  } as any)
                  .execute();

                await trx.insertInto('sale_line_stock_allocations').values({
                   tenant_id: scope.tenantId,
                   account_id: scope.accountId,
                   sale_id: id,
                   sale_line_id: saleLineId,
                   product_id: Number(mod.productId),
                   location_id: alloc.locationId as number,
                   quantity: alloc.qty,
                   allocation_order: modAllocationOrder++,
                }).execute();
              }
            }
          }
        }

      }

      if (normalized.storeCreditUsed > 0 && customer) {
        await trx
          .updateTable('customers')
          .set({ store_credit_balance: Number((Number(customer.store_credit_balance || 0) - normalized.storeCreditUsed).toFixed(2)), updated_at: sql`NOW()` })
          .where('id', '=', customer.id)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
      }

      if (normalized.loyaltyPointsRedeemed > 0 && customer) {
        await trx
          .updateTable('customers')
          .set({ loyalty_points: pointsAfterRedeem, updated_at: sql`NOW()` } as any)
          .where('id', '=', customer.id)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();

        await trx
          .insertInto('customer_loyalty_logs')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            customer_id: customer.id,
            points_change: -normalized.loyaltyPointsRedeemed,
            balance_after: pointsAfterRedeem,
            action_type: 'redeem',
            sale_id: id,
            notes: `استبدال ${normalized.loyaltyPointsRedeemed} نقطة بخصم ${loyaltyDiscount} ج.م في الفاتورة S-${id}`,
            created_at: sql`NOW()`,
          } as any)
          .execute();
      }

      // Automatically award loyalty points based on paid amount (1 point per 100 EGP)
      if (customer && paidAmount > 0) {
        const pointsEarned = Math.floor(paidAmount / 100);
        if (pointsEarned > 0) {
          const startingPoints = normalized.loyaltyPointsRedeemed > 0 ? pointsAfterRedeem : Number((customer as any)?.loyalty_points || 0);
          const finalPoints = Number((startingPoints + pointsEarned).toFixed(2));

          await trx
            .updateTable('customers')
            .set({ loyalty_points: finalPoints, updated_at: sql`NOW()` } as any)
            .where('id', '=', customer.id)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .execute();

          await trx
            .insertInto('customer_loyalty_logs')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              customer_id: customer.id,
              points_change: pointsEarned,
              balance_after: finalPoints,
              action_type: 'earn',
              sale_id: id,
              notes: `اكتساب ${pointsEarned} نقطة من مشتريات الفاتورة S-${id}`,
              created_at: sql`NOW()`,
            } as any)
            .execute();
        }
      }

      if (customer && remainingDebt > 0) {
        await this.finance.createCustomerLedgerEntry(
          trx,
          customer.id,
          remainingDebt,
          `فاتورة بيع S-${id}${paidAmount > 0 ? ' (متبقي آجل)' : ''}`,
          id,
          auth,
        );
      }

      if (!isCodDelivery) {
        for (const payment of payments) {
          if (payment.paymentChannel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(
            trx,
            payment.amount,
            `فاتورة بيع S-${id} - نقدي`,
            id,
            auth,
            normalized.branchId,
            normalized.locationId,
          );
        }

        // When a delivery order with a freelance courier is paid electronically (online/card/wallet/instapay/credit),
        // the courier takes their delivery fee in cash directly from the active cash drawer.
        // Auto-record a cash_out treasury transaction so the cashier's expected cash in drawer decreases accurately.
        if (
          isDelivery &&
          resolvedDeliveryFeeMode === 'freelance_courier' &&
          normalized.deliveryFee > 0
        ) {
          const nonCashPaidTotal = payments
            .filter((p) => p.paymentChannel !== 'cash')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

          if (nonCashPaidTotal > 0 || payments.length === 0 || effectivePaymentType === 'credit') {
            const openShift = await trx
              .selectFrom('cashier_shifts')
              .select(['id', 'branch_id', 'location_id'])
              .where('opened_by', '=', auth.userId)
              .where('status', '=', 'open')
              .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
              .orderBy('id', 'desc')
              .executeTakeFirst();

            if (openShift) {
              const repRow = deliveryRepId
                ? await trx
                    .selectFrom('delivery_representatives')
                    .select(['name'])
                    .where('id', '=', Number(deliveryRepId))
                    .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
                    .executeTakeFirst()
                : null;
              const repLabel = repRow?.name ? repRow.name : `مندوب #${deliveryRepId || ''}`;

              await trx
                .insertInto('treasury_transactions')
                .values({
                  txn_type: 'cash_out',
                  amount: normalized.deliveryFee,
                  note: `صرف أجرة توصيل نقداً للمندوب ${repLabel} عن فاتورة #${docNo || id}`,
                  reference_type: 'cashier_shift',
                  reference_id: openShift.id,
                  branch_id: normalized.branchId || openShift.branch_id,
                  location_id: normalized.locationId || openShift.location_id,
                  created_by: auth.userId,
                  tenant_id: scope.tenantId,
                  account_id: scope.accountId,
                } as any)
                .execute();

              await sql`
                update cashier_shifts
                set expected_cash = greatest(0, coalesce(expected_cash, 0) - ${normalized.deliveryFee}),
                    updated_at = now()
                where tenant_id = ${scope.tenantId} and id = ${openShift.id}
              `.execute(trx);
            }
          }
        }
      }

      try {
        await this.accountingPosting.postSale(trx, id, auth);
      } catch (error) {
        this.logger.error(`Failed to post accounting journal for sale ${id}`, error instanceof Error ? error.stack : String(error));
        throw error;
      }

      // Commit idempotency record atomically inside the business transaction
      if (idemCtx?.idempotencyKey && idemCtx?.operationType) {
        await this.idempotency.commitOperation(
          trx,
          { tenantId: scope.tenantId, accountId: scope.accountId, idempotencyKey: idemCtx.idempotencyKey, operationType: idemCtx.operationType },
          { ok: true, saleId: id },
          String(id)
        );
      }

      return id;
    });
    const transactionDurationMs = Date.now() - txStartedAt;

    const postReadsStartedAt = Date.now();
    await this.audit.log('إنشاء فاتورة بيع', `تم إنشاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth);

    // Non-blocking auto WhatsApp invoice notification
    if (this.whatsappService) {
      void this.whatsappService.sendInvoiceNotification(saleId, auth, { autoOnly: true }).catch((err) => {
        this.logger.warn(`WhatsApp auto-invoice notification failed for sale ${saleId}: ${err?.message || err}`);
      });
    }

    const sale = await this.query.getSaleById(saleId, auth);
    const postTransactionReadsDurationMs = Date.now() - postReadsStartedAt;
    const totalRequestDurationMs = Date.now() - requestStartedAt;

    if (this.shouldLogCheckoutTimings()) {
      this.logger.log(
        `[checkout-timing] saleId=${saleId} items=${normalized.items.length} txMs=${transactionDurationMs} postReadsMs=${postTransactionReadsDurationMs} totalMs=${totalRequestDurationMs}`,
      );
    }

    return { ok: true, sale: sale.sale };
  }

  async updateSale(saleId: number, payload: UpsertSaleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const normalized = normalizeSalePayload(payload);
    const editReason = String((payload as unknown as { editReason?: string })?.editReason || '').trim();
    const managerPin = String((payload as unknown as { managerPin?: string })?.managerPin || '').trim();

    if (!normalized.items.length) throw new AppError('Sale must include at least one item', 'SALE_ITEMS_REQUIRED', 400);
    ensureUniqueFlowItems(normalized.items, 'SALE_DUPLICATE_PRODUCT', 'Sale must not contain duplicate product rows with the same unit');
    if (normalized.discount < 0) throw new AppError('Discount cannot be negative', 'INVALID_DISCOUNT', 400);
    if (editReason.length < 5) throw new AppError('سبب التعديل مطلوب بشكل واضح.', 'SALE_EDIT_REASON_REQUIRED', 400);
    const isAdmin = auth.role === 'admin' || auth.role === 'super_admin';
    if (!isAdmin && !managerPin) throw new AppError('رمز اعتماد المدير مطلوب قبل تعديل الفاتورة.', 'MANAGER_AUTH_REQUIRED', 400);
    if (!isAdmin || managerPin) await this.authz.authorizeDiscountOverride(managerPin, auth, this.db);

    await this.tx.runInTransaction(this.db, async (trx) => {
      const sale = await trx
        .selectFrom('sales')
        .selectAll()
        .where('id', '=', saleId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst();
      if (!sale) throw new AppError('الفاتورة غير موجودة.', 'SALE_NOT_FOUND', 404);
      if (sale.status === 'cancelled') throw new AppError('لا يمكن تعديل الفاتورة بعد إلغائها أو وجود عمليات مرتبطة تمنع التعديل.', 'SALE_EDIT_CANCELLED_FORBIDDEN', 400);

      let branch: any = null;
      if (normalized.source === 'pos') {
        if (!normalized.branchId) {
          throw new AppError('يجب تحديد الفرع لعمليات البيع عبر الكاشير.', 'POS_BRANCH_REQUIRED', 400);
        }
        branch = await trx.selectFrom('branches').select(['default_stock_location_id', 'sales_stock_mode', 'allow_external_sales_stock']).where('id', '=', normalized.branchId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
        if (!branch?.default_stock_location_id) {
          throw new AppError('لا يوجد مخزون افتراضي نشط لهذا الفرع، يرجى تحديده من الإعدادات قبل البيع.', 'POS_DEFAULT_STOCK_REQUIRED', 400);
        }
        normalized.locationId = branch.default_stock_location_id;
      }

      let eligibleLocations = [{ id: normalized.locationId, branchId: normalized.branchId }];
      if (normalized.source === 'pos' && branch?.sales_stock_mode === 'all_operational_locations') {
        const allLocs = await trx.selectFrom('stock_locations')
          .select(['id', 'location_type', 'branch_id'])
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .where('is_active', '=', true)
          .where('location_type', 'not in', ['damaged', 'in_transit'])
          .execute();
          
        const defaultLocId = branch.default_stock_location_id;
        
        const sortedLocs = allLocs.filter(l => {
           if (l.id === defaultLocId) return true;
           if (l.branch_id === normalized.branchId) return true;
           if (l.location_type === 'internal_warehouse' && l.branch_id === null) return true;
           if (branch.allow_external_sales_stock && l.location_type === 'external_warehouse') return true;
           return false;
        }).sort((a, b) => {
           if (a.id === defaultLocId) return -1;
           if (b.id === defaultLocId) return 1;
           if (a.branch_id === normalized.branchId && b.branch_id !== normalized.branchId) return -1;
           if (a.branch_id !== normalized.branchId && b.branch_id === normalized.branchId) return 1;
           if (a.location_type === 'internal_warehouse' && b.location_type !== 'internal_warehouse') return -1;
           if (a.location_type !== 'internal_warehouse' && b.location_type === 'internal_warehouse') return 1;
           return 0;
        });
        
        eligibleLocations = sortedLocs.map(l => ({ id: l.id, branchId: l.branch_id }));
      }

      const existingReturns = await trx
        .selectFrom('return_documents')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('return_type', '=', 'sale')
        .where('invoice_id', '=', saleId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst();
      if (Number(existingReturns?.count || 0) > 0) {
        throw new AppError('لا يمكن تعديل هذه الفاتورة بعد إلغائها أو وجود عمليات مرتبطة تمنع التعديل.', 'SALE_EDIT_LINKED_OPERATIONS_FORBIDDEN', 400);
      }

      const existingEditedJournal = await trx
        .selectFrom('journal_entries')
        .select(['id'])
        .where('source_type', '=', 'sale_edit')
        .where('source_id', '=', saleId)
        .where('status', 'in', ['draft', 'posted'])
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst();
      if (existingEditedJournal) {
        throw new AppError('تم تعديل هذه الفاتورة سابقًا. أنشئ فاتورة جديدة بدلًا من إعادة التعديل.', 'SALE_EDIT_ALREADY_APPLIED', 400);
      }

      const currentItems = await trx
        .selectFrom('sale_items')
        .selectAll()
        .where('sale_id', '=', saleId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute();
      const currentPayments = await trx
        .selectFrom('sale_payments')
        .select(['amount', 'payment_channel'])
        .where('sale_id', '=', saleId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute();

      for (const item of currentItems) {
        if (!item.product_id) continue;
        const restoreQty = Number((Number(item.qty || 0) * Number(item.unit_multiplier || 1)).toFixed(3));

        const allocations = await trx.selectFrom('sale_line_stock_allocations')
           .selectAll()
           .where('sale_line_id', '=', item.id)
           .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
           .execute();

        if (allocations.length > 0) {
           let remainingToRestore = restoreQty;
           for (const alloc of allocations) {
             if (remainingToRestore <= 0) break;
             const allocQty = Number(alloc.quantity || 0);
             const qtyToRestore = Math.min(allocQty, remainingToRestore);
             remainingToRestore -= qtyToRestore;

             // Find branch for this location
             const locData = await trx.selectFrom('stock_locations').select('branch_id').where('id', '=', alloc.location_id).executeTakeFirst();
             const branchId = locData?.branch_id || sale.branch_id;

             const stockChange = await applyStockDelta(trx, {
               productId: Number(item.product_id),
               delta: qtyToRestore,
               branchId: branchId,
               locationId: alloc.location_id,
               tenantId: scope.tenantId,
               accountId: scope.accountId,
             });

             await trx.insertInto('stock_movements').values({
               product_id: item.product_id,
               movement_type: 'sale_edit_reversal',
               qty: qtyToRestore,
               before_qty: stockChange.scopeBefore,
               after_qty: stockChange.scopeAfter,
               reason: 'sale_edit_reversal',
               note: `Edit reversal S-${saleId}`,
               reference_type: 'sale',
               reference_id: saleId,
               branch_id: branchId,
               location_id: alloc.location_id,
               created_by: auth.userId,
               tenant_id: scope.tenantId,
               account_id: scope.accountId,
             }).execute();
           }
        } else {
           // Fallback for legacy sales without allocations
           const stockChange = await applyStockDelta(trx, {
             productId: Number(item.product_id),
             delta: restoreQty,
             branchId: sale.branch_id,
             locationId: sale.location_id,
             tenantId: scope.tenantId,
             accountId: scope.accountId,
           });
           await trx.insertInto('stock_movements').values({
             product_id: item.product_id,
             movement_type: 'sale_edit_reversal',
             qty: restoreQty,
             before_qty: stockChange.scopeBefore,
             after_qty: stockChange.scopeAfter,
             reason: 'sale_edit_reversal',
             note: `Edit reversal S-${saleId}`,
             reference_type: 'sale',
             reference_id: saleId,
             branch_id: sale.branch_id,
             location_id: sale.location_id,
             created_by: auth.userId,
             tenant_id: scope.tenantId,
             account_id: scope.accountId,
           }).execute();
        }
      }

      const oldCollectibleTotal = Math.max(0, Number(sale.total || 0) - Number(sale.store_credit_used || 0));
      if (sale.payment_type === 'credit' && sale.customer_id && oldCollectibleTotal > 0) {
        await this.finance.createCustomerLedgerEntry(trx, sale.customer_id, -oldCollectibleTotal, `عكس تعديل فاتورة بيع S-${saleId}`, saleId, auth);
      } else {
        for (const payment of currentPayments) {
          if (payment.payment_channel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(trx, -Number(payment.amount || 0), `عكس تعديل فاتورة بيع S-${saleId}`, saleId, auth, sale.branch_id, sale.location_id);
        }
      }

      if (Number(sale.store_credit_used || 0) > 0 && sale.customer_id) {
        const customerBefore = await trx
          .selectFrom('customers')
          .select(['store_credit_balance'])
          .where('id', '=', sale.customer_id)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .executeTakeFirst();
        if (customerBefore) {
          await trx.updateTable('customers').set({
            store_credit_balance: Number((Number(customerBefore.store_credit_balance || 0) + Number(sale.store_credit_used || 0)).toFixed(2)),
            updated_at: sql`NOW()`,
          }).where('id', '=', sale.customer_id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
        }
      }

      await this.accountingPosting.reverseSaleJournal(trx, saleId, `تعديل فاتورة: ${editReason}`, auth);

      await trx.deleteFrom('sale_payments').where('sale_id', '=', saleId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      await trx.deleteFrom('sale_items').where('sale_id', '=', saleId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      const customer = normalized.customerId
        ? await trx.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit', 'store_credit_balance']).where('id', '=', normalized.customerId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst()
        : null;
      if (normalized.customerId && !customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
      if (normalized.paymentType === 'credit' && !customer) throw new AppError('Credit sale requires a customer', 'CUSTOMER_REQUIRED_FOR_CREDIT', 400);
      const allowNegativeStockSales = await this.getAllowNegativeStockSales(trx, scope.tenantId);

      let subtotal = 0;
      const preparedItems = [];
      const autoProduceItems = [];
      for (const item of normalized.items) {
        if (Number(item.price || 0) <= 0) {
          throw new AppError('Sale item price must be greater than zero', 'INVALID_SALE_PRICE', 400);
        }
        const product = await trx.selectFrom('products as p')
          .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
          .select(['p.id', 'p.name', 'p.stock_qty', 'p.retail_price', 'p.wholesale_price', 'p.cost_price', 'p.item_type', 'b.id as bom_id'])
          .where('p.id', '=', item.productId)
          .where(sql<boolean>`p.tenant_id = ${scope.tenantId}`)
          .where('p.is_active', '=', true)
          .executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        
        const activeOffers = await this.getCurrentProductOffers(trx, item.productId, scope.tenantId);
        const allowedUnitPrice = calculateAllowedSaleUnitPrice({
          retailPrice: product.retail_price,
          wholesalePrice: product.wholesale_price,
          priceType: item.priceType,
          offers: activeOffers,
          qty: item.qty,
          unitMultiplier: item.unitMultiplier,
        });
        this.assertUnitPriceChangeAllowed(auth, Number(item.price || 0), allowedUnitPrice);
        
        const availableStockQty = normalized.locationId
          ? await previewConsumableStockQty(trx, { productId: item.productId, branchId: normalized.branchId, locationId: normalized.locationId, tenantId: scope.tenantId, accountId: scope.accountId })
          : Number(product.stock_qty || 0);
          
        const hasBOM = !!product.bom_id;
        let finalProductName = product.name;

        if (hasBOM) {
          const bomLines = await trx.selectFrom('manufacturing_bom_lines as l')
            .innerJoin('products as p', 'p.id', 'l.component_product_id')
            .select('p.name')
            .where('l.bom_id', '=', Number(product.bom_id))
            .execute();
          
          if (bomLines.length > 0) {
            finalProductName = `${product.name} (${bomLines.map(l => l.name).join(' + ')})`;
          }
        }

        const preparedItem = buildPreparedSaleItem(
          { ...product, name: finalProductName, stock_qty: availableStockQty }, 
          item, 
          { allowNegativeStockSales: allowNegativeStockSales || hasBOM || (product as any).item_type === 'service' }
        );
        subtotal += preparedItem.lineTotal;
        preparedItems.push({ ...preparedItem, isService: (product as any).item_type === 'service' });
        
        if (hasBOM) {
          autoProduceItems.push({
            productId: item.productId,
            requiredQty: preparedItem.requiredQty,
            availableQty: availableStockQty,
            hasBOM: true,
            bomId: Number(product.bom_id),
            unitMultiplier: item.unitMultiplier,
          });
        }
      }

      await this.assertDiscountChangeAllowed(trx, auth, normalized.discount, managerPin, subtotal);
      if (normalized.discount > subtotal) throw new AppError('Discount cannot exceed subtotal', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = computeInvoiceTotals(subtotal, normalized.discount, normalized.taxRate, normalized.pricesIncludeTax, normalized.deliveryFee);
      if (normalized.storeCreditUsed > total + 0.0001) throw new AppError('Store credit cannot exceed invoice total', 'INVALID_STORE_CREDIT', 400);
      const collectibleTotal = calculateCollectibleTotal(total, normalized.storeCreditUsed);
      if (normalized.paymentType === 'credit' && customer) {
        const nextBalance = Number(customer.balance || 0) + collectibleTotal;
        if (Number(customer.credit_limit || 0) > 0 && nextBalance > Number(customer.credit_limit || 0)) throw new AppError('Customer credit limit exceeded', 'CUSTOMER_CREDIT_LIMIT', 400);
      }
      if (normalized.storeCreditUsed > 0) {
        if (!customer) throw new AppError('Store credit requires a customer', 'CUSTOMER_REQUIRED_FOR_CREDIT', 400);
        if (normalized.storeCreditUsed > Number(customer.store_credit_balance || 0) + 0.0001) throw new AppError('Store credit exceeds available balance', 'STORE_CREDIT_EXCEEDED', 400);
      }

      const payments = resolveSalePayments(normalized.paymentType, normalized.payments, collectibleTotal, normalized.paymentChannel);
      const paidAmount = calculatePaidAmount(payments);
      const isPartialCredit = Boolean(normalized.customerId) && paidAmount + 0.0001 < collectibleTotal;
      const effectivePaymentType = (isPartialCredit || normalized.paymentType === 'credit') ? 'credit' : 'cash';
      if (effectivePaymentType !== 'credit' && paidAmount + 0.0001 < collectibleTotal) throw new AppError('Paid amount cannot be less than invoice total', 'INVALID_PAID_AMOUNT', 400);

      await trx.updateTable('sales').set({
        customer_id: normalized.customerId,
        customer_name: customer?.name || 'عميل نقدي',
        customer_phone: payload.customerPhone || null,
        customer_address: payload.customerAddress || null,
        payment_type: effectivePaymentType,
        payment_channel: resolvePostedSalePaymentChannel(effectivePaymentType, payments),
        subtotal: Number(subtotal.toFixed(2)),
        discount: normalized.discount,
        delivery_fee: normalized.deliveryFee,
        tax_rate: normalized.taxRate,
        tax_amount: taxAmount,
        prices_include_tax: normalized.pricesIncludeTax,
        total,
        paid_amount: paidAmount,
        store_credit_used: normalized.storeCreditUsed,
        note: normalized.note,
        branch_id: normalized.branchId,
        location_id: normalized.locationId,
        updated_at: sql`NOW()`,
      }).where('id', '=', saleId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      for (const payment of payments) {
        await trx.insertInto('sale_payments').values({ sale_id: saleId, payment_channel: payment.paymentChannel, amount: payment.amount, tenant_id: scope.tenantId, account_id: scope.accountId }).execute();
      }

      await this.autoProduceShortfall(trx, autoProduceItems, saleId, normalized.branchId, normalized.locationId, scope, auth);

      for (const item of preparedItems) {
        const itemSerials = Array.isArray(item.serials) ? item.serials : [];
        const insertedLine = await trx.insertInto('sale_items').values({
          sale_id: saleId,
          product_id: item.productId,
          product_name: item.productName,
          qty: item.qty,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          unit_name: item.unitName,
          unit_multiplier: item.unitMultiplier,
          cost_price: item.costPrice,
          price_type: item.priceType as 'retail' | 'wholesale',
          modifiers: item.modifiers ? JSON.stringify(item.modifiers) : '[]',
          serials: itemSerials.length > 0 ? JSON.stringify(itemSerials) : '[]',
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).returning('id').executeTakeFirstOrThrow();
        const saleLineId = Number(insertedLine.id);

        if (itemSerials.length > 0) {
          const cleanSerials = itemSerials.map((s: any) =>
            (typeof s === 'string' ? s : s?.serialNumber || s?.serial || '').trim().toLowerCase()
          ).filter(Boolean);

          if (cleanSerials.length > 0) {
            await trx
              .updateTable('product_serials')
              .set({
                status: 'sold',
                sale_id: saleId,
                sale_item_id: saleLineId,
                updated_at: sql`NOW()`,
              })
              .where('product_id', '=', item.productId)
              .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
              .where(sql<boolean>`LOWER(serial_number) in (${sql.join(cleanSerials)})`)
              .execute();
          }
        }

        if (item.isService) {
          continue;
        }

        let remainingQty = item.requiredQty;
        let allocationOrder = 1;
        const allocations = [];

        for (const loc of eligibleLocations) {
          if (remainingQty <= 0) break;
          const locStock = await trx.selectFrom('product_location_stock')
            .select('qty')
            .where('product_id', '=', item.productId)
            .where('location_id', '=', loc.id)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .forUpdate()
            .executeTakeFirst();
          
          const availableQty = Number(locStock?.qty || 0);
          if (availableQty > 0) {
            const allocateQty = Math.min(availableQty, remainingQty);
            remainingQty = Number((remainingQty - allocateQty).toFixed(3));
            allocations.push({ locationId: loc.id, branchId: loc.branchId, qty: allocateQty });
          }
        }

        if (remainingQty > 0) {
           if (!allowNegativeStockSales) {
              throw new AppError(`Insufficient stock for ${item.productName}`, 'INSUFFICIENT_STOCK', 400);
           }
           allocations.push({ locationId: normalized.locationId, branchId: normalized.branchId, qty: remainingQty });
           remainingQty = 0;
        }

        for (const alloc of allocations) {
          const stockChange = await applyStockDelta(trx, {
            productId: item.productId,
            delta: -alloc.qty,
            branchId: alloc.branchId,
            locationId: alloc.locationId,
            tenantId: scope.tenantId,
            accountId: scope.accountId,
            errorCode: 'INSUFFICIENT_STOCK',
            errorMessage: `Insufficient stock for ${item.productName}`,
            allowNegative: allowNegativeStockSales,
          });

          await trx.insertInto('stock_movements').values({
            product_id: item.productId,
            movement_type: 'sale_edit',
            qty: -alloc.qty,
            before_qty: stockChange.scopeBefore,
            after_qty: stockChange.scopeAfter,
            reason: 'sale_edit',
            note: `Sale edit S-${saleId}`,
            reference_type: 'sale',
            reference_id: saleId,
            branch_id: alloc.branchId,
            location_id: alloc.locationId,
            created_by: auth.userId,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          }).execute();

          await trx.insertInto('sale_line_stock_allocations').values({
             tenant_id: scope.tenantId,
             account_id: scope.accountId,
             sale_id: saleId,
             sale_line_id: saleLineId,
             product_id: item.productId,
             location_id: alloc.locationId as number,
             quantity: alloc.qty,
             allocation_order: allocationOrder++,
          }).execute();
        }

        await this.deductPharmacyBatchesFefo(trx, item.productId, item.requiredQty, scope, allowNegativeStockSales);

        if (item.modifiers && Array.isArray(item.modifiers)) {
          for (const mod of item.modifiers) {
            if (mod.productId) {
              const modifierQty = Number(mod.qty || 1) * Number(item.qty || 1);
              
              let modRemainingQty = modifierQty;
              let modAllocationOrder = 1;
              const modAllocations = [];

              for (const loc of eligibleLocations) {
                if (modRemainingQty <= 0) break;
                const locStock = await trx.selectFrom('product_location_stock')
                  .select('qty')
                  .where('product_id', '=', Number(mod.productId))
                  .where('location_id', '=', loc.id)
                  .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
                  .forUpdate()
                  .executeTakeFirst();
                
                const availableQty = Number(locStock?.qty || 0);
                if (availableQty > 0) {
                  const allocateQty = Math.min(availableQty, modRemainingQty);
                  modRemainingQty = Number((modRemainingQty - allocateQty).toFixed(3));
                  modAllocations.push({ locationId: loc.id, branchId: loc.branchId, qty: allocateQty });
                }
              }

              if (modRemainingQty > 0) {
                 if (!allowNegativeStockSales) {
                    throw new AppError(`Insufficient stock for modifier ${mod.name}`, 'INSUFFICIENT_MODIFIER_STOCK', 400);
                 }
                 modAllocations.push({ locationId: normalized.locationId, branchId: normalized.branchId, qty: modRemainingQty });
                 modRemainingQty = 0;
              }

              for (const alloc of modAllocations) {
                const modStockChange = await applyStockDelta(trx, {
                  productId: Number(mod.productId),
                  delta: -alloc.qty,
                  branchId: alloc.branchId,
                  locationId: alloc.locationId,
                  tenantId: scope.tenantId,
                  accountId: scope.accountId,
                  errorCode: 'INSUFFICIENT_MODIFIER_STOCK',
                  errorMessage: `Insufficient stock for modifier ${mod.name}`,
                  allowNegative: allowNegativeStockSales,
                });

                await trx
                  .insertInto('stock_movements')
                  .values({
                    product_id: Number(mod.productId),
                    movement_type: 'sale_edit',
                    qty: -alloc.qty,
                    before_qty: modStockChange.scopeBefore,
                    after_qty: modStockChange.scopeAfter,
                    reason: 'sale_edit_modifier',
                    note: `Sale edit S-${saleId} (${item.productName})`,
                    reference_type: 'sale',
                    reference_id: saleId,
                    branch_id: alloc.branchId,
                    location_id: alloc.locationId,
                    created_by: auth.userId,
                    tenant_id: scope.tenantId,
                    account_id: scope.accountId,
                  } as any)
                  .execute();

                await trx.insertInto('sale_line_stock_allocations').values({
                   tenant_id: scope.tenantId,
                   account_id: scope.accountId,
                   sale_id: saleId,
                   sale_line_id: saleLineId,
                   product_id: Number(mod.productId),
                   location_id: alloc.locationId as number,
                   quantity: alloc.qty,
                   allocation_order: modAllocationOrder++,
                }).execute();
              }
            }
          }
        }
      }

      if (normalized.storeCreditUsed > 0 && customer) {
        await trx.updateTable('customers').set({
          store_credit_balance: Number((Number(customer.store_credit_balance || 0) - normalized.storeCreditUsed).toFixed(2)),
          updated_at: sql`NOW()`,
        }).where('id', '=', customer.id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      }

      const remainingDebt = Number(Math.max(0, collectibleTotal - paidAmount).toFixed(2));
      if (customer && remainingDebt > 0) {
        await this.finance.createCustomerLedgerEntry(
          trx,
          customer.id,
          remainingDebt,
          `تعديل فاتورة بيع S-${saleId}${paidAmount > 0 ? ' (متبقي آجل)' : ''}`,
          saleId,
          auth,
        );
      }

      for (const payment of payments) {
        if (payment.paymentChannel !== 'cash') continue;
        await this.finance.addTreasuryTransaction(trx, payment.amount, `تعديل فاتورة بيع S-${saleId}`, saleId, auth, normalized.branchId, normalized.locationId);
      }

      await this.accountingPosting.postSaleEdit(trx, saleId, auth);
    });

    await this.audit.log('تعديل فاتورة بيع', `تم تعديل الفاتورة S-${saleId} بواسطة ${auth.username} | السبب: ${editReason}`, auth);
    const sale = await this.query.getSaleById(saleId, auth);
    return { ok: true, sale: sale.sale };
  }

  async cancelSale(saleId: number, reason: string, managerPin: string, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    if (!managerPin) throw new AppError('رمز اعتماد المدير مطلوب لإلغاء الفاتورة.', 'MANAGER_AUTH_REQUIRED', 400);
    await this.authz.authorizeDiscountOverride(managerPin, auth, this.db);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const sale = await trx.selectFrom('sales').selectAll().where('id', '=', saleId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (!sale) throw new AppError('Sale not found', 'SALE_NOT_FOUND', 404);
      if (sale.status === 'cancelled') throw new AppError('Sale already cancelled', 'SALE_ALREADY_CANCELLED', 400);

      const items = await trx.selectFrom('sale_items').selectAll().where('sale_id', '=', saleId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
      for (const item of items) {
        if (!item.product_id) continue;
        const product = await trx.selectFrom('products').select(['stock_qty']).where('id', '=', item.product_id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
        if (!product) continue;
        const { restoreQty } = calculateRestoredStockQuantity(product.stock_qty, item.qty, item.unit_multiplier);

        const allocations = await trx.selectFrom('sale_line_stock_allocations')
           .selectAll()
           .where('sale_line_id', '=', item.id)
           .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
           .execute();

        if (allocations.length > 0) {
           for (const alloc of allocations) {
             const qtyToRestore = Number(alloc.quantity || 0);

             // Find branch for this location
             const locData = await trx.selectFrom('stock_locations').select('branch_id').where('id', '=', alloc.location_id).executeTakeFirst();
             const branchId = locData?.branch_id || sale.branch_id;

             const stockChange = await applyStockDelta(trx, {
               productId: alloc.product_id,
               delta: qtyToRestore,
               branchId: branchId,
               locationId: alloc.location_id,
               tenantId: scope.tenantId,
               accountId: scope.accountId,
               allowNegative: true,
             });

             await trx
               .insertInto('stock_movements')
               .values({
                 product_id: alloc.product_id,
                 movement_type: 'sale_cancel',
                 qty: qtyToRestore,
                 before_qty: stockChange.scopeBefore,
                 after_qty: stockChange.scopeAfter,
                 reason: 'sale_cancel',
                 note: `Cancel S-${saleId}`,
                 reference_type: 'sale',
                 reference_id: saleId,
                 branch_id: branchId,
                 location_id: alloc.location_id,
                 created_by: auth.userId,
                 tenant_id: scope.tenantId,
                 account_id: scope.accountId,
               } as any)
               .execute();
           }
        } else {
           // Fallback for legacy sales without allocations
           const stockChange = await applyStockDelta(trx, {
             productId: Number(item.product_id),
             delta: restoreQty,
             branchId: sale.branch_id,
             locationId: sale.location_id,
             tenantId: scope.tenantId,
             accountId: scope.accountId,
           });
           await trx
             .insertInto('stock_movements')
             .values({
               product_id: item.product_id,
               movement_type: 'sale_cancel',
               qty: restoreQty,
               before_qty: stockChange.scopeBefore,
               after_qty: stockChange.scopeAfter,
               reason: 'sale_cancel',
               note: `Cancel S-${saleId}`,
               reference_type: 'sale',
               reference_id: saleId,
               branch_id: sale.branch_id,
               location_id: sale.location_id,
               created_by: auth.userId,
               tenant_id: scope.tenantId,
               account_id: scope.accountId,
             } as any)
             .execute();
        }
      }

      const collectibleTotal = Math.max(0, Number(sale.total || 0) - Number(sale.store_credit_used || 0));
      if (sale.payment_type === 'credit' && sale.customer_id && collectibleTotal > 0) {
        await this.finance.createCustomerLedgerEntry(trx, sale.customer_id, -collectibleTotal, `عكس فاتورة بيع S-${saleId}`, saleId, auth);
      } else {
        const cashPayments = await trx.selectFrom('sale_payments').select(['amount', 'payment_channel']).where('sale_id', '=', saleId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
        for (const payment of cashPayments) {
          if (payment.payment_channel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(trx, -Number(payment.amount || 0), `إلغاء فاتورة بيع S-${saleId}`, saleId, auth, sale.branch_id, sale.location_id);
        }
      }

      if (Number(sale.store_credit_used || 0) > 0 && sale.customer_id) {
        const customer = await trx.selectFrom('customers').select(['store_credit_balance']).where('id', '=', sale.customer_id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
        if (customer) {
          await trx.updateTable('customers').set({ store_credit_balance: Number((Number(customer.store_credit_balance || 0) + Number(sale.store_credit_used || 0)).toFixed(2)), updated_at: sql`NOW()` }).where('id', '=', sale.customer_id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
        }
      }

      await trx
        .updateTable('sales')
        .set({ status: 'cancelled', cancel_reason: String(reason || '').trim(), cancelled_by: auth.userId, cancelled_at: sql`NOW()`, updated_at: sql`NOW()` })
        .where('id', '=', saleId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute();

      try {
        await this.accountingPosting.reverseSaleJournal(trx, saleId, String(reason || '').trim(), auth);
      } catch (error) {
        this.logger.error(`Failed to post reversal accounting journal for cancelled sale ${saleId}`, error instanceof Error ? error.stack : String(error));
        throw error;
      }
    });

    await this.audit.log('إلغاء فاتورة بيع', `تم إلغاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth);
    return { ok: true, sales: (await this.query.listSales({}, auth)).sales };
  }

  async saveHeldSale(payload: HeldSaleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
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
          notes: String(item.notes || '').trim(),
          modifiers: item.modifiers || [],
        }))
        .filter((entry) => entry.productId > 0 && entry.qty > 0);

      if (!items.length) throw new AppError('Held draft must include at least one item', 'HELD_DRAFT_ITEMS_REQUIRED', 400);
      await this.assertDiscountChangeAllowed(trx, auth, Number(payload.discount || 0), payload.managerPin);

      for (const item of items) {
        let finalProductName = item.productName;
        const product = await trx.selectFrom('products as p')
          .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
          .select(['p.id', 'p.retail_price', 'p.wholesale_price', 'b.id as bom_id'])
          .where('p.id', '=', item.productId)
          .where(sql<boolean>`p.tenant_id = ${scope.tenantId}`)
          .where('p.is_active', '=', true)
          .executeTakeFirst();
        
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);

        if (product.bom_id) {
          const bomLines = await trx.selectFrom('manufacturing_bom_lines as l')
            .innerJoin('products as p', 'p.id', 'l.component_product_id')
            .select('p.name')
            .where('l.bom_id', '=', Number(product.bom_id))
            .execute();
          
          if (bomLines.length > 0) {
            finalProductName = `${item.productName} (${bomLines.map(l => l.name).join(' + ')})`;
          }
        }
        item.productName = finalProductName;

        const activeOffers = await this.getCurrentProductOffers(trx, item.productId, scope.tenantId);
        const allowedUnitPrice = calculateAllowedSaleUnitPrice({
          retailPrice: product.retail_price,
          wholesalePrice: product.wholesale_price,
          priceType: item.priceType,
          offers: activeOffers,
          qty: item.qty,
        });
        this.assertUnitPriceChangeAllowed(auth, item.unitPrice, allowedUnitPrice);
      }

      type SalePaymentChannel = 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';
      const rawRequestedChannel = String(payload.paymentChannel || '').trim();
      const requestedChannel: SalePaymentChannel | '' = (['cash', 'card', 'wallet', 'instapay', 'mixed', 'credit'] as const)
        .includes(rawRequestedChannel as SalePaymentChannel)
        ? (rawRequestedChannel as SalePaymentChannel)
        : '';
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
      const cashAmount = paymentType === 'credit' ? 0 : Math.max(0, Number(payload.cashAmount || 0));
      const cardAmount = paymentType === 'credit' ? 0 : Math.max(0, Number(payload.cardAmount || 0));
      const transferAmount = paymentType === 'credit' ? 0 : Math.max(0, Number(payload.transferAmount || 0));
      const paidAmount = paymentType === 'credit'
        ? 0
        : Number((cashAmount + cardAmount + transferAmount).toFixed(2));

      const paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit' = paymentType === 'credit'
        ? 'credit'
        : (() => {
          if (requestedChannel === 'wallet' || requestedChannel === 'instapay') return requestedChannel;
          const hasCash = cashAmount > 0.0001;
          const hasCard = cardAmount > 0.0001;
          const hasTransfer = transferAmount > 0.0001;

          if ((hasCash && hasCard) || (hasCash && hasTransfer) || (hasCard && hasTransfer)) return 'mixed';
          if (hasCard) return 'card';
          if (hasTransfer) return 'wallet';
          if (requestedChannel === 'card') return 'card';
          return 'cash';
        })();

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
          delivery_fee: Number(payload.deliveryFee || 0),
          note: String(payload.note || '').trim(),
          search: String(payload.search || '').trim(),
          table_number: String(payload.tableNumber || '').trim(),
          order_type: String(payload.orderType || 'takeaway').trim(),
          price_type: payload.priceType === 'wholesale' ? 'wholesale' : 'retail',
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_id: payload.locationId ? Number(payload.locationId) : null,
          delivery_rep_id: (payload as any).deliveryRepId ? Number((payload as any).deliveryRepId) : null,
          collection_status: (payload as any).deliveryRepId ? ((payload as any).collectionStatus || null) : null,
          created_by: auth.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
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
            notes: item.notes || '',
            modifiers: item.modifiers ? JSON.stringify(item.modifiers) : '[]',
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          } as any)
          .execute();
      }

      return id;
    });

    await this.audit.log('حفظ فاتورة معلقة', `تم حفظ فاتورة معلقة #${heldSaleId} بواسطة ${auth.username}`, auth);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  async deleteHeldSale(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const heldSale = await this.db
      .selectFrom('held_sales')
      .select(['id', 'created_by'])
      .where('id', '=', id)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
    if (!heldSale || !this.authz.canAccessHeldSale(auth, heldSale)) {
      throw new AppError('Held sale not found', 'HELD_SALE_NOT_FOUND', 404);
    }

    await this.db.deleteFrom('held_sales').where('id', '=', id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
    await this.audit.log('حذف فاتورة معلقة', `تم حذف فاتورة معلقة #${id} بواسطة ${auth.username}`, auth);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  async clearHeldSales(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const canManageHeldSales = this.authz.canManageHeldSales(auth);
    const ownerUserId = this.authz.heldSaleOwnerUserId(auth);
    const result = await this.db
      .deleteFrom('held_sales')
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .$if(!canManageHeldSales, (qb) => qb.where('created_by', '=', ownerUserId ?? -1))
      .execute();
    const deletedCount = Number(result?.[0]?.numDeletedRows ?? NaN);
    const scopeLabel = canManageHeldSales ? 'privileged broader management' : 'own held sales';
    const countLabel = Number.isFinite(deletedCount) ? ` | deletedCount=${deletedCount}` : '';
    await this.audit.log('حذف كل الفواتير المعلقة', `تم حذف كل الفواتير المعلقة بواسطة ${auth.username} | scope=${scopeLabel}${countLabel}`, auth);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  private async generateSaleDocNo(trx: Kysely<Database>, saleId: number, tenantId: string): Promise<string> {
    const settingRow = await trx
      .selectFrom('settings')
      .select(['value'])
      .where('key', '=', 'invoiceNumberingScheme')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    let scheme = 'daily';
    if (settingRow?.value) {
      try {
        scheme = JSON.parse(settingRow.value);
      } catch {
        scheme = String(settingRow.value);
      }
    }

    if (scheme === 'sequential') {
      return `Z-${saleId}`;
    }

    // Daily date-based numbering: Z-YYMMDD-0001
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const lastDoc = await trx
      .selectFrom('sales')
      .select(sql<number>`COALESCE(MAX(CASE WHEN doc_no ~ '^[A-Za-z0-9]+-[0-9]+-[0-9]+$' THEN CAST(SPLIT_PART(doc_no, '-', 3) AS INTEGER) ELSE 0 END), 0)`.as('last_seq'))
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('created_at', '>=', startOfDay)
      .executeTakeFirst();

    const nextSeq = Number(lastDoc?.last_seq || 0) + 1;
    const seq = String(nextSeq).padStart(4, '0');
    return `Z-${datePrefix}-${seq}`;
  }
}
