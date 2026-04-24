import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely, sql, type Transaction } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { computeInvoiceTotals } from '../../../common/utils/invoice-totals';
import { ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewConsumableStockQty } from '../../../common/utils/location-stock-ledger';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { HeldSaleDto } from '../dto/held-sale.dto';
import { PosAuditEventDto } from '../dto/pos-audit-event.dto';
import { UpsertSaleDto } from '../dto/upsert-sale.dto';
import { normalizeSalePayload } from '../helpers/sales-payload.helper';
import { buildPreparedSaleItem, calculateAllowedSaleUnitPrice, calculateCollectibleTotal, calculatePaidAmount, calculateRestoredStockQuantity, resolvePostedSalePaymentChannel, resolveSalePayments } from '../helpers/sales-write.helper';
import { SalesAuthorizationService } from './sales-authorization.service';
import { SalesFinanceService } from './sales-finance.service';
import { SalesQueryService } from './sales-query.service';

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
    await this.authz.authorizeDiscountOverride(String(managerPin || '').trim(), trx);
  }

  private assertUnitPriceChangeAllowed(auth: AuthContext, providedPrice: number, allowedPrice: number): void {
    if (Math.abs(Number(providedPrice || 0) - Number(allowedPrice || 0)) <= 0.0001) return;
    if (this.authz.hasPermission(auth, 'canEditPrice')) return;
    throw new AppError('Price changes require canEditPrice permission', 'PRICE_CHANGE_FORBIDDEN', 403);
  }

  private async getCurrentProductOffers(trx: Kysely<Database> | Transaction<Database>, productId: number) {
    const todayIso = new Date().toISOString().slice(0, 10);
    return trx
      .selectFrom('product_offers')
      .select(['offer_type', 'value', 'start_date', 'end_date', 'min_qty'])
      .where('product_id', '=', productId)
      .where('is_active', '=', true)
      .where((eb) => eb.and([
        eb.or([eb('start_date', 'is', null), eb('start_date', '<=', todayIso)]),
        eb.or([eb('end_date', 'is', null), eb('end_date', '>=', todayIso)]),
      ]))
      .orderBy('id', 'desc')
      .execute();
  }

  async authorizeDiscountOverride(secret: string, _auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await this.authz.authorizeDiscountOverride(String(secret || '').trim(), this.db);
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
    const requestStartedAt = Date.now();
    const normalized = normalizeSalePayload(payload);
    if (!normalized.items.length) throw new AppError('Sale must include at least one item', 'SALE_ITEMS_REQUIRED', 400);
    ensureUniqueFlowItems(normalized.items, 'SALE_DUPLICATE_PRODUCT', 'Sale must not contain duplicate product rows with the same unit');

    const txStartedAt = Date.now();
    const saleId = await this.tx.runInTransaction(this.db, async (trx) => {
      if (normalized.discount < 0) throw new AppError('Discount cannot be negative', 'INVALID_DISCOUNT', 400);
      if (normalized.storeCreditUsed < 0) throw new AppError('Store credit cannot be negative', 'INVALID_STORE_CREDIT', 400);

      const customer = normalized.customerId
        ? await trx.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit', 'store_credit_balance']).where('id', '=', normalized.customerId).where('is_active', '=', true).executeTakeFirst()
        : null;
      if (normalized.customerId && !customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
      if (normalized.paymentType === 'credit' && !customer) throw new AppError('Credit sale requires a customer', 'CUSTOMER_REQUIRED_FOR_CREDIT', 400);

      let subtotal = 0;
      const preparedItems = [];
      for (const item of normalized.items) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty', 'retail_price', 'wholesale_price', 'cost_price']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const activeOffers = await this.getCurrentProductOffers(trx, item.productId);
        const allowedUnitPrice = calculateAllowedSaleUnitPrice({
          retailPrice: product.retail_price,
          wholesalePrice: product.wholesale_price,
          priceType: item.priceType,
          offers: activeOffers,
          qty: item.qty,
        });
        this.assertUnitPriceChangeAllowed(auth, Number(item.price || 0), allowedUnitPrice);

        const availableStockQty = normalized.locationId
          ? await previewConsumableStockQty(trx, { productId: item.productId, branchId: normalized.branchId, locationId: normalized.locationId })
          : Number(product.stock_qty || 0);
        const preparedItem = buildPreparedSaleItem({ ...product, stock_qty: availableStockQty }, item);
        subtotal += preparedItem.lineTotal;
        preparedItems.push(preparedItem);
      }

      await this.assertDiscountChangeAllowed(trx, auth, normalized.discount, normalized.managerPin);
      if (normalized.discount > subtotal) throw new AppError('Discount cannot exceed subtotal', 'INVALID_DISCOUNT', 400);
      const { taxAmount, total } = computeInvoiceTotals(subtotal, normalized.discount, normalized.taxRate, normalized.pricesIncludeTax);
      if (normalized.storeCreditUsed > total + 0.0001) throw new AppError('Store credit cannot exceed invoice total', 'INVALID_STORE_CREDIT', 400);

      const collectibleTotal = calculateCollectibleTotal(total, normalized.storeCreditUsed);
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

      const payments = resolveSalePayments(normalized.paymentType, normalized.payments, collectibleTotal);
      const paidAmount = calculatePaidAmount(payments);
      if (normalized.paymentType !== 'credit' && paidAmount + 0.0001 < collectibleTotal) {
        throw new AppError('Paid amount cannot be less than invoice total', 'INVALID_PAID_AMOUNT', 400);
      }

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

        const stockChange = await applyStockDelta(trx, {
          productId: item.productId,
          delta: -item.requiredQty,
          branchId: normalized.branchId,
          locationId: normalized.locationId,
          errorCode: 'INSUFFICIENT_STOCK',
          errorMessage: `Insufficient stock for ${item.productName}`,
        });
        await trx
          .insertInto('stock_movements')
          .values({
            product_id: item.productId,
            movement_type: 'sale',
            qty: -item.requiredQty,
            before_qty: stockChange.scopeBefore,
            after_qty: stockChange.scopeAfter,
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

    return { ok: true, sale: sale.sale };
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
        const { restoreQty } = calculateRestoredStockQuantity(product.stock_qty, item.qty, item.unit_multiplier);
        const stockChange = await applyStockDelta(trx, {
          productId: Number(item.product_id),
          delta: restoreQty,
          branchId: sale.branch_id,
          locationId: sale.location_id,
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

    await this.audit.log('إلغاء فاتورة بيع', `تم إلغاء الفاتورة S-${saleId} بواسطة ${auth.username}`, auth);
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
      await this.assertDiscountChangeAllowed(trx, auth, Number(payload.discount || 0), payload.managerPin);

      for (const item of items) {
        const product = await trx.selectFrom('products').select(['id', 'retail_price', 'wholesale_price']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const activeOffers = await this.getCurrentProductOffers(trx, item.productId);
        const allowedUnitPrice = calculateAllowedSaleUnitPrice({
          retailPrice: product.retail_price,
          wholesalePrice: product.wholesale_price,
          priceType: item.priceType,
          offers: activeOffers,
          qty: item.qty,
        });
        this.assertUnitPriceChangeAllowed(auth, item.unitPrice, allowedUnitPrice);
      }

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

    await this.audit.log('حفظ فاتورة معلقة', `تم حفظ فاتورة معلقة #${heldSaleId} بواسطة ${auth.username}`, auth);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  async deleteHeldSale(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const heldSale = await this.db
      .selectFrom('held_sales')
      .select(['id', 'created_by'])
      .where('id', '=', id)
      .executeTakeFirst();
    if (!heldSale || !this.authz.canAccessHeldSale(auth, heldSale)) {
      throw new AppError('Held sale not found', 'HELD_SALE_NOT_FOUND', 404);
    }

    await this.db.deleteFrom('held_sales').where('id', '=', id).execute();
    await this.audit.log('حذف فاتورة معلقة', `تم حذف فاتورة معلقة #${id} بواسطة ${auth.username}`, auth);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }

  async clearHeldSales(auth: AuthContext): Promise<Record<string, unknown>> {
    const canManageHeldSales = this.authz.canManageHeldSales(auth);
    const ownerUserId = this.authz.heldSaleOwnerUserId(auth);
    const result = await this.db
      .deleteFrom('held_sales')
      .$if(!canManageHeldSales, (qb) => qb.where('created_by', '=', ownerUserId ?? -1))
      .execute();
    const deletedCount = Number(result?.[0]?.numDeletedRows ?? NaN);
    const scopeLabel = canManageHeldSales ? 'privileged broader management' : 'own held sales';
    const countLabel = Number.isFinite(deletedCount) ? ` | deletedCount=${deletedCount}` : '';
    await this.audit.log('حذف كل الفواتير المعلقة', `تم حذف كل الفواتير المعلقة بواسطة ${auth.username} | scope=${scopeLabel}${countLabel}`, auth);
    return { ok: true, heldSales: (await this.query.listHeldSales(auth)).heldSales };
  }
}
