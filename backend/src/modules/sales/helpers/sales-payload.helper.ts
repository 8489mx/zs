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

  const normalizedPayments = (Array.isArray(payload.payments) ? payload.payments : [])
    .map((entry) => ({
      paymentChannel: (entry.paymentChannel === 'card' ? 'card' : 'cash') as 'cash' | 'card',
      amount: Number(entry.amount || 0),
    }))
    .filter((entry) => entry.amount > 0);

  const fallbackChannel = payload.paymentChannel === 'card' ? 'card' : 'cash';
  const payments = paymentType === 'credit' ? [] : normalizedPayments;
  const paymentChannel: 'cash' | 'card' | 'mixed' | 'credit' = paymentType === 'credit'
    ? 'credit'
    : (payments.length > 1 ? 'mixed' : (payments[0]?.paymentChannel || fallbackChannel));

  return {
    customerId,
    paymentType,
    paymentChannel,
    discount: Number(payload.discount || 0),
    taxRate: Number(payload.taxRate || 0),
    pricesIncludeTax: Boolean(payload.pricesIncludeTax),
    storeCreditUsed: Number(payload.storeCreditUsed || 0),
    note: String(payload.note || '').trim(),
    managerPin: String(payload.managerPin || '').trim(),
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
