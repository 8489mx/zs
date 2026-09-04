import { AppError } from '../../../common/errors/app-error';
import { NormalizedSalePayload, UpsertSaleDto } from '../dto/upsert-sale.dto';

type FlexibleSalePayload = UpsertSaleDto & {
  customer_id?: number | string | null;
  customer?: { id?: number | string | null } | null;
};

function resolveCustomerId(payload: FlexibleSalePayload): number | null {
  const direct = payload.customerId ?? payload.customer_id ?? payload.customer?.id ?? null;
  const numeric = Number(direct || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function assertCreditSaleCustomer(paymentType: 'cash' | 'credit', customerId: number | null): void {
  if (paymentType !== 'credit') return;
  if (customerId) return;
  throw new AppError('Credit sale requires a selected customer', 'CREDIT_SALE_REQUIRES_CUSTOMER', 400);
}

export function normalizeSalePayload(payload: UpsertSaleDto): NormalizedSalePayload {
  const flexiblePayload = payload as FlexibleSalePayload;
  const paymentType = payload.paymentType === 'credit' || payload.paymentChannel === 'credit' ? 'credit' : 'cash';
  const customerId = resolveCustomerId(flexiblePayload);

  assertCreditSaleCustomer(paymentType, customerId);

  const requestedPaymentChannel = payload.paymentChannel === 'card'
    ? 'card'
    : payload.paymentChannel === 'wallet'
      ? 'wallet'
      : payload.paymentChannel === 'instapay'
        ? 'instapay'
        : payload.paymentChannel === 'mixed'
          ? 'mixed'
          : 'cash';

  const normalizedPayments = (Array.isArray(payload.payments) ? payload.payments : [])
    .map((entry) => ({
      paymentChannel: (
        entry.paymentChannel === 'card'
          ? 'card'
          : entry.paymentChannel === 'wallet'
            ? 'wallet'
            : entry.paymentChannel === 'instapay'
              ? 'instapay'
              : 'cash'
      ) as 'cash' | 'card' | 'wallet' | 'instapay',
      amount: Number(entry.amount || 0),
    }))
    .filter((entry) => entry.amount > 0);

  // Guard against stale POS state: if the cashier selected "فيزا" but the
  // payment input still arrived as a single cash line, trust the explicit
  // selected channel and keep the sale out of the cash drawer.
  const correctedPayments = (
    ['card', 'wallet', 'instapay'].includes(requestedPaymentChannel)
    && normalizedPayments.length > 0
    && normalizedPayments.every((entry) => entry.paymentChannel === 'cash')
      ? normalizedPayments.map((entry) => ({
        ...entry,
        paymentChannel: requestedPaymentChannel as 'card' | 'wallet' | 'instapay',
      }))
      : normalizedPayments
  );

  const fallbackChannel = requestedPaymentChannel === 'card'
    ? 'card'
    : requestedPaymentChannel === 'wallet'
      ? 'wallet'
      : requestedPaymentChannel === 'instapay'
        ? 'instapay'
        : 'cash';
  const payments = paymentType === 'credit' && payload.paymentChannel === 'credit'
    ? []
    : correctedPayments;
  const paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit' = paymentType === 'credit'
    ? (payments.length ? (payments.length > 1 ? 'mixed' : (payments[0]?.paymentChannel || 'credit')) : 'credit')
    : (requestedPaymentChannel === 'mixed'
      ? (payments.length ? 'mixed' : fallbackChannel)
      : (payments.length > 1 ? 'mixed' : (payments[0]?.paymentChannel || fallbackChannel)));

  return {
    customerId,
    paymentType,
    paymentChannel,
    discount: Number(payload.discount || 0),
    deliveryFee: Number(payload.deliveryFee || 0),
    taxRate: Number(payload.taxRate || 0),
    pricesIncludeTax: Boolean(payload.pricesIncludeTax),
    storeCreditUsed: Number(payload.storeCreditUsed || 0),
    loyaltyPointsRedeemed: Math.max(0, Number(payload.loyaltyPointsRedeemed || 0)),
    note: String(payload.note || '').trim(),
    managerPin: String(payload.managerPin || '').trim(),
    branchId: payload.branchId ? Number(payload.branchId) : null,
    locationId: payload.locationId ? Number(payload.locationId) : null,
    source: payload.source === 'pos' ? 'pos' : 'dashboard',
    payments,
    tenderedAmount: Number(payload.tenderedAmount || 0),
    tableNumber: typeof payload.tableNumber === 'string' ? payload.tableNumber.trim() : null,
    orderType: typeof payload.orderType === 'string' ? payload.orderType.trim() : null,
    items: payload.items
      .map((item) => ({
        productId: Number(item.productId || 0),
        qty: Number((item as any).qty ?? (item as any).quantity ?? 0),
        price: Number((item as any).price ?? (item as any).unitPrice ?? 0),
        originalPrice: item.originalPrice != null && Number(item.originalPrice) > 0 ? Number(item.originalPrice) : undefined,
        offerDiscount: item.offerDiscount != null && Number(item.offerDiscount) > 0 ? Number(item.offerDiscount) : undefined,
        offerName: item.offerName ? String(item.offerName).trim() : undefined,
        unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
        unitMultiplier: Number(item.unitMultiplier || 1) || 1,
        priceType: (item.priceType === 'wholesale' ? 'wholesale' : 'retail') as 'retail' | 'wholesale',
        notes: String(item.notes || '').trim(),
        modifiers: item.modifiers || [],
        serials: Array.isArray(item.serials) ? item.serials : undefined,
      }))
      .filter((item) => item.productId > 0 && item.qty > 0),
  };
}
