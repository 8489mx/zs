import { NormalizedSalePayload, UpsertSaleDto } from '../dto/upsert-sale.dto';

export function normalizeSalePayload(payload: UpsertSaleDto): NormalizedSalePayload {
  const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
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
    customerId: payload.customerId ? Number(payload.customerId) : null,
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
