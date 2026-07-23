import { Inject, Injectable, Logger } from '@nestjs/common';
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
  ) {}

  private shouldLogCheckoutTimings(): boolean {
    return String(process.env.CHECKOUT_TIMINGS || '').trim() === '1';
  }

  private async assertDiscountChangeAllowed(
    trx: Kysely<Database> | Transaction<Database>,
    auth: AuthContext,
    discount: number,
    managerPin?: string | null,
  ): Promise<void> {
    if (Math.abs(Number(discount || 0)) <= 0.0001) return;
    if (this.authz.hasPermission(auth, 'canDiscount')) return;
    await this.authz.authorizeDiscountOverride(String(managerPin || '').trim(), auth, trx);
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
  ) {
    for (const item of items) {
      if (!item.hasBOM || !item.bomId) continue;
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
        .select(['l.component_product_id', 'l.quantity', 'l.expected_cost', 'l.waste_percentage', 'p.name as component_name'])
        .where('l.bom_id', '=', item.bomId)
        .execute();

      for (const line of bomLines) {
        const wasteFactor = 1 / (1 - (Number(line.waste_percentage || 0) / 100));
        const requiredMaterialQty = Number((Number(line.quantity) * wasteFactor * (qtyToProduce / bomQuantity)).toFixed(3));
        const lineTotalCost = Number((Number(line.expected_cost) * wasteFactor * (qtyToProduce / bomQuantity)).toFixed(3));

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
              }], saleId, branchId, locationId, scope, auth);
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
      if (cached) return cached.response as Record<string, unknown>;
    }

    const normalized = normalizeSalePayload(payload);
    if (!normalized.items.length) throw new AppError('Sale must include at least one item', 'SALE_ITEMS_REQUIRED', 400);
    ensureUniqueFlowItems(normalized.items, 'SALE_DUPLICATE_PRODUCT', 'Sale must not contain duplicate product rows with the same unit');

    const txStartedAt = Date.now();
    const saleId = await this.tx.runInTransaction(this.db, async (trx) => {
      if (normalized.discount < 0) throw new AppError('Discount cannot be negative', 'INVALID_DISCOUNT', 400);
      if (normalized.storeCreditUsed < 0) throw new AppError('Store credit cannot be negative', 'INVALID_STORE_CREDIT', 400);

      const customer = normalized.customerId
        ? await trx.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit', 'store_credit_balance']).where('id', '=', normalized.customerId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).executeTakeFirst()
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

      let subtotal = 0;
      const preparedItems = [];
      const autoProduceItems = [];
      for (const item of normalized.items) {
        if (Number(item.price || 0) <= 0) {
          throw new AppError('Sale item price must be greater than zero', 'INVALID_SALE_PRICE', 400);
        }
        const product = await trx.selectFrom('products as p')
          .leftJoin('manufacturing_boms as b', (join) => join.onRef('b.product_id', '=', 'p.id').on('b.is_active', '=', true))
          .select(['p.id', 'p.name', 'p.stock_qty', 'p.retail_price', 'p.wholesale_price', 'p.cost_price', 'b.id as bom_id'])
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
        });
        this.assertUnitPriceChangeAllowed(auth, Number(item.price || 0), allowedUnitPrice);

        let availableStockQty = 0;
        if (!normalized.locationId) {
          availableStockQty = Number(product.stock_qty || 0);
        } else if (eligibleLocations.length === 1) {
          availableStockQty = await previewConsumableStockQty(trx, { productId: item.productId, branchId: normalized.branchId, locationId: normalized.locationId, tenantId: scope.tenantId, accountId: scope.accountId });
        } else {
          // If all_operational_locations is enabled, sum the stock of all eligible locations + unassigned
          const locIds = eligibleLocations.map(l => l.id).filter(id => id != null);
          const stockRows = await trx.selectFrom('product_location_stock')
            .select(['location_id', 'branch_id', 'qty'])
            .where('product_id', '=', item.productId)
            .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
            .execute();
          
          let totalEligible = 0;
          for (const row of stockRows) {
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
          { allowNegativeStockSales: allowNegativeStockSales || hasBOM }
        );
        subtotal += preparedItem.lineTotal;
        preparedItems.push(preparedItem);
        
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

      await this.assertDiscountChangeAllowed(trx, auth, normalized.discount, normalized.managerPin);
      if (normalized.discount > subtotal) throw new AppError('Discount cannot exceed subtotal', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = computeInvoiceTotals(subtotal, normalized.discount, normalized.taxRate, normalized.pricesIncludeTax);
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

      const payments = resolveSalePayments(normalized.paymentType, normalized.payments, collectibleTotal, normalized.paymentChannel);
      const paidAmount = calculatePaidAmount(payments);
      if (normalized.paymentType !== 'credit' && paidAmount + 0.0001 < collectibleTotal) {
        throw new AppError('Paid amount cannot be less than invoice total', 'INVALID_PAID_AMOUNT', 400);
      }

      const appliedCash = payments.find((p) => p.paymentChannel === 'cash')?.amount || 0;
      let finalTenderedAmount = normalized.tenderedAmount > 0 ? normalized.tenderedAmount : appliedCash;
      if (finalTenderedAmount < appliedCash) {
        finalTenderedAmount = appliedCash;
      }
      const changeAmount = Number(Math.max(0, finalTenderedAmount - appliedCash).toFixed(2));

      const saleInsert = await trx
        .insertInto('sales')
        .values({
          customer_id: normalized.customerId,
          customer_name: customer?.name || 'عميل نقدي',
          payment_type: normalized.paymentType,
          payment_channel: resolvePostedSalePaymentChannel(normalized.paymentType, payments),
          subtotal: Number(subtotal.toFixed(2)),
          discount: normalized.discount,
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
          created_by: auth.userId,
          cancel_reason: '',
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(saleInsert.id);
      await trx.updateTable('sales').set({ doc_no: `S-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();

      for (const payment of payments) {
        await trx.insertInto('sale_payments').values({ sale_id: id, payment_channel: payment.paymentChannel, amount: payment.amount, tenant_id: scope.tenantId, account_id: scope.accountId }).execute();
      }

      await this.autoProduceShortfall(trx, autoProduceItems, id, normalized.branchId, normalized.locationId, scope, auth);

      for (const item of preparedItems) {
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
            modifiers: item.modifiers ? JSON.stringify(item.modifiers) : '[]',
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          } as any)
          .returning('id')
          .executeTakeFirstOrThrow();
        const saleLineId = Number(insertedLine.id);

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
                    note: `إضافة للفاتورة S-${id} (${item.productName})`,
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

      if (normalized.paymentType === 'credit' && customer && collectibleTotal > 0) {
        await this.finance.createCustomerLedgerEntry(trx, customer.id, collectibleTotal, `فاتورة بيع S-${id}`, id, auth);
      } else {
        for (const payment of payments) {
          if (payment.paymentChannel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(trx, payment.amount, `فاتورة بيع S-${id} - نقدي`, id, auth, normalized.branchId, normalized.locationId);
        }
      }

      try {
        await this.accountingPosting.postSale(trx, id, auth);
      } catch (error) {
        this.logger.error(`Failed to post accounting journal for sale ${id}`, error instanceof Error ? error.stack : String(error));
        throw error;
      }

      return id;
    });
    const transactionDurationMs = Date.now() - txStartedAt;

    const postReadsStartedAt = Date.now();
    await this.audit.log('إنشاء فاتورة بيع', `تم إنشاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth);
    const sale = await this.query.getSaleById(saleId, auth);
    const postTransactionReadsDurationMs = Date.now() - postReadsStartedAt;
    const totalRequestDurationMs = Date.now() - requestStartedAt;

    if (this.shouldLogCheckoutTimings()) {
      this.logger.log(
        `[checkout-timing] saleId=${saleId} items=${normalized.items.length} txMs=${transactionDurationMs} postReadsMs=${postTransactionReadsDurationMs} totalMs=${totalRequestDurationMs}`,
      );
    }

    const result = { ok: true, sale: sale.sale };

    // Idempotency: commit the response so future duplicate requests return it
    if (idemCtx && idemCtx.idempotencyKey && idemCtx.operationType) {
      await this.idempotency.commitOperation(
        this.db,
        { tenantId: scope.tenantId, accountId: scope.accountId, idempotencyKey: idemCtx.idempotencyKey, operationType: idemCtx.operationType },
        result
      );
    }

    return result;
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
          .select(['p.id', 'p.name', 'p.stock_qty', 'p.retail_price', 'p.wholesale_price', 'p.cost_price', 'b.id as bom_id'])
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
          { allowNegativeStockSales: allowNegativeStockSales || hasBOM }
        );
        subtotal += preparedItem.lineTotal;
        preparedItems.push(preparedItem);
        
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

      await this.assertDiscountChangeAllowed(trx, auth, normalized.discount, managerPin);
      if (normalized.discount > subtotal) throw new AppError('Discount cannot exceed subtotal', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = computeInvoiceTotals(subtotal, normalized.discount, normalized.taxRate, normalized.pricesIncludeTax);
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
      if (normalized.paymentType !== 'credit' && paidAmount + 0.0001 < collectibleTotal) throw new AppError('Paid amount cannot be less than invoice total', 'INVALID_PAID_AMOUNT', 400);

      await trx.updateTable('sales').set({
        customer_id: normalized.customerId,
        customer_name: customer?.name || 'عميل نقدي',
        payment_type: normalized.paymentType,
        payment_channel: resolvePostedSalePaymentChannel(normalized.paymentType, payments),
        subtotal: Number(subtotal.toFixed(2)),
        discount: normalized.discount,
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        }).returning('id').executeTakeFirstOrThrow();
        const saleLineId = Number(insertedLine.id);

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

      if (normalized.paymentType === 'credit' && customer && collectibleTotal > 0) {
        await this.finance.createCustomerLedgerEntry(trx, customer.id, collectibleTotal, `تعديل فاتورة بيع S-${saleId}`, saleId, auth);
      } else {
        for (const payment of payments) {
          if (payment.paymentChannel !== 'cash') continue;
          await this.finance.addTreasuryTransaction(trx, payment.amount, `تعديل فاتورة بيع S-${saleId}`, saleId, auth, normalized.branchId, normalized.locationId);
        }
      }

      await this.accountingPosting.postSaleEdit(trx, saleId, auth);
    });

    await this.audit.log('تعديل فاتورة بيع', `تم تعديل الفاتورة S-${saleId} بواسطة ${auth.username} | السبب: ${editReason}`, auth);
    const sale = await this.query.getSaleById(saleId, auth);
    return { ok: true, sale: sale.sale };
  }

  async cancelSale(saleId: number, reason: string, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
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
          note: String(payload.note || '').trim(),
          search: String(payload.search || '').trim(),
          price_type: payload.priceType === 'wholesale' ? 'wholesale' : 'retail',
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_id: payload.locationId ? Number(payload.locationId) : null,
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
}
