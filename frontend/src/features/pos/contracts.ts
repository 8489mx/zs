import type { PosItem } from '@/features/pos/types/pos.types';

export type PaymentType = 'cash' | 'credit';
export type PaymentChannel = 'cash' | 'card' | 'credit' | 'mixed';

export interface PosPaymentInput {
  paymentChannel: 'cash' | 'card';
  amount: number;
}

export interface CreatePosSaleInput {
  cart: PosItem[];
  customerId: string;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  discount: number;
  note: string;
  paidAmount: number;
  payments: PosPaymentInput[];
  taxRate: number;
  pricesIncludeTax: boolean;
  expectedTotal: number;
  managerPin?: string;
  branchId?: string | null;
  locationId?: string | null;
}

function normalizeMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeCart(items: PosItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    qty: Math.max(1, Number(item.qty || 0)),
    unitName: item.unitName,
    unitMultiplier: Math.max(1, Number(item.unitMultiplier || 1)),
    price: normalizeMoney(Number(item.price || 0)),
    priceType: item.priceType
  }));
}

export function validatePosSaleInput(input: CreatePosSaleInput) {
  if (!input.cart.length) throw new Error('أضف صنفًا واحدًا على الأقل');
  if (input.cart.some((item) => !item.productId)) throw new Error('توجد عناصر غير صالحة داخل السلة');
  if (input.cart.some((item) => Number(item.qty || 0) <= 0)) throw new Error('كمية الصنف يجب أن تكون أكبر من صفر');
  if (input.paymentType === 'credit' && !input.customerId) throw new Error('اختر العميل أولًا في حالة البيع الآجل');
  if (input.paymentType === 'credit' && input.paymentChannel !== 'credit') throw new Error('قناة السداد يجب أن تكون آجل مع البيع الآجل');
  if (input.paymentType === 'cash' && input.paymentChannel === 'credit') throw new Error('لا يمكن استخدام قناة آجل مع بيع نقدي');
  if (Number(input.discount || 0) < 0) throw new Error('الخصم لا يمكن أن يكون سالبًا');
  if (Number(input.expectedTotal || 0) < 0) throw new Error('إجمالي الفاتورة غير صالح');
  const paymentsTotal = (input.payments || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  if (input.paymentType !== 'credit' && paymentsTotal < Number(input.expectedTotal || 0)) {
    throw new Error('المبلغ المدفوع أقل من إجمالي الفاتورة');
  }
}

export function buildPosSalePayload(input: CreatePosSaleInput) {
  validatePosSaleInput(input);

  return {
    customerId: input.customerId || null,
    paymentType: input.paymentType,
    paymentChannel: input.paymentChannel,
    discount: normalizeMoney(Number(input.discount || 0)),
    note: String(input.note || '').trim(),
    payments: (input.payments || [])
      .filter((entry) => Number(entry.amount || 0) > 0)
      .map((entry) => ({
        paymentChannel: entry.paymentChannel === 'card' ? 'card' : 'cash',
        amount: normalizeMoney(Number(entry.amount || 0))
      })),
    storeCreditUsed: 0,
    taxRate: normalizeMoney(Number(input.taxRate || 0)),
    ...(String(input.managerPin || '').trim() ? { managerPin: String(input.managerPin || '').trim() } : {}),
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    branchId: input.branchId || null,
    locationId: input.locationId || null,
    items: normalizeCart(input.cart)
  };
}

export function buildLegacyPosSalePayload(input: CreatePosSaleInput) {
  validatePosSaleInput(input);

  const normalizedItems = normalizeCart(input.cart);
  const simplePaymentChannel =
    input.paymentType === 'credit'
      ? 'credit'
      : ((input.payments || []).length === 1 && input.payments[0].paymentChannel === 'card' ? 'card' : 'cash');

  return {
    customerId: input.customerId || null,
    paymentType: input.paymentType,
    paymentChannel: simplePaymentChannel,
    discount: normalizeMoney(Number(input.discount || 0)),
    note: String(input.note || '').trim(),
    taxRate: normalizeMoney(Number(input.taxRate || 0)),
    ...(String(input.managerPin || '').trim() ? { managerPin: String(input.managerPin || '').trim() } : {}),
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    branchId: input.branchId || null,
    locationId: input.locationId || null,
    items: normalizedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      unitName: item.unitName,
      unitMultiplier: item.unitMultiplier,
      price: item.price,
      priceType: item.priceType
    }))
  };
}

export function buildMinimalPosSalePayload(input: CreatePosSaleInput) {
  validatePosSaleInput(input);

  const normalizedItems = normalizeCart(input.cart);
  return {
    customerId: input.customerId || null,
    paymentType: input.paymentType,
    ...(String(input.managerPin || '').trim() ? { managerPin: String(input.managerPin || '').trim() } : {}),
    items: normalizedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price
    }))
  };
}
