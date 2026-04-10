export interface CustomerPaymentPayloadInput {
  customerId: string;
  amount: number;
  note?: string;
}

export interface SupplierPaymentPayloadInput {
  supplierId: string;
  amount: number;
  note?: string;
}

function normalizeMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function buildCustomerPaymentPayload(input: CustomerPaymentPayloadInput) {
  if (!input.customerId) throw new Error('اختر العميل أولًا');
  if (Number(input.amount || 0) <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

  return {
    customerId: input.customerId,
    amount: normalizeMoney(input.amount),
    note: String(input.note || '').trim()
  };
}

export function buildSupplierPaymentPayload(input: SupplierPaymentPayloadInput) {
  if (!input.supplierId) throw new Error('اختر المورد أولًا');
  if (Number(input.amount || 0) <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

  return {
    supplierId: input.supplierId,
    amount: normalizeMoney(input.amount),
    note: String(input.note || '').trim()
  };
}
