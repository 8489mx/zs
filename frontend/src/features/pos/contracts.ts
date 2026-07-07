import type { PosItem } from '@/features/pos/types/pos.types';

export type PaymentType = 'cash' | 'credit';
export type PaymentChannel = 'cash' | 'card' | 'wallet' | 'instapay' | 'credit' | 'mixed';

export interface PosPaymentInput {
  paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay';
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
  source?: 'pos' | 'dashboard';
}

function normalizeMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeCustomerId(value: string) {
  return String(value || '').trim();
}

function normalizeCartQty(item: PosItem) {
  const qty = Number(item.qty || 0);
  if (item.isWeighted === true) return Number(Math.max(0.001, qty).toFixed(3));
  return Math.max(1, Math.round(qty));
}

function normalizeCart(items: PosItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    qty: normalizeCartQty(item),
    unitName: item.unitName,
    unitMultiplier: Math.max(1, Number(item.unitMultiplier || 1)),
    price: normalizeMoney(Number(item.price || 0)),
    priceType: item.priceType,
    notes: item.notes,
    modifiers: item.modifiers
  }));
}

export function validatePosSaleInput(input: CreatePosSaleInput) {
  if (!input.cart.length) throw new Error('أضف صنفًا واحدًا على الأقل');
  if (input.cart.some((item) => !item.productId)) throw new Error('توجد عناصر غير صالحة داخل السلة');
  if (input.cart.some((item) => Number(item.qty || 0) <= 0)) throw new Error('كمية الصنف يجب أن تكون أكبر من صفر');
  if (input.paymentType === 'credit' && !normalizeCustomerId(input.customerId)) throw new Error('اختر العميل أولًا في حالة البيع الآجل');
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

  const customerId = normalizeCustomerId(input.customerId);
  return {
    customerId: customerId || null,
    paymentType: input.paymentType,
    paymentChannel: input.paymentChannel,
    discount: normalizeMoney(Number(input.discount || 0)),
    note: String(input.note || '').trim(),
    payments: (input.payments || [])
      .filter((entry) => Number(entry.amount || 0) > 0)
      .map((entry) => ({
        paymentChannel: entry.paymentChannel === 'card'
          ? 'card'
          : entry.paymentChannel === 'wallet'
            ? 'wallet'
            : entry.paymentChannel === 'instapay'
              ? 'instapay'
              : 'cash',
        amount: normalizeMoney(Number(entry.amount || 0))
      })),
    storeCreditUsed: 0,
    taxRate: normalizeMoney(Number(input.taxRate || 0)),
    ...(String(input.managerPin || '').trim() ? { managerPin: String(input.managerPin || '').trim() } : {}),
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    branchId: input.branchId || null,
    locationId: input.locationId || null,
    source: input.source || 'pos',
    items: normalizeCart(input.cart)
  };
}

export function buildLegacyPosSalePayload(input: CreatePosSaleInput) {
  validatePosSaleInput(input);

  const customerId = normalizeCustomerId(input.customerId);
  const normalizedItems = normalizeCart(input.cart);
  const positivePayments = (input.payments || []).filter((entry) => Number(entry.amount || 0) > 0);
  const uniqueChannels = Array.from(new Set(positivePayments.map((entry) => entry.paymentChannel)));
  const simplePaymentChannel: PaymentChannel =
    input.paymentType === 'credit'
      ? 'credit'
      : uniqueChannels.length > 1
        ? 'mixed'
        : uniqueChannels[0] === 'instapay'
          ? 'instapay'
          : uniqueChannels[0] === 'wallet'
            ? 'wallet'
            : uniqueChannels[0] === 'card'
              ? 'card'
              : 'cash';

  return {
    customerId: customerId || null,
    paymentType: input.paymentType,
    paymentChannel: simplePaymentChannel,
    discount: normalizeMoney(Number(input.discount || 0)),
    note: String(input.note || '').trim(),
    taxRate: normalizeMoney(Number(input.taxRate || 0)),
    ...(String(input.managerPin || '').trim() ? { managerPin: String(input.managerPin || '').trim() } : {}),
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    branchId: input.branchId || null,
    locationId: input.locationId || null,
    source: input.source || 'pos',
    items: normalizedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      unitName: item.unitName,
      unitMultiplier: item.unitMultiplier,
      price: item.price,
      priceType: item.priceType,
      notes: item.notes,
      modifiers: item.modifiers
    }))
  };
}

export function buildMinimalPosSalePayload(input: CreatePosSaleInput) {
  validatePosSaleInput(input);

  const customerId = normalizeCustomerId(input.customerId);
  const normalizedItems = normalizeCart(input.cart);
  return {
    customerId: customerId || null,
    paymentType: input.paymentType,
    ...(String(input.managerPin || '').trim() ? { managerPin: String(input.managerPin || '').trim() } : {}),
    source: input.source || 'pos',
    items: normalizedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price
    }))
  };
}
