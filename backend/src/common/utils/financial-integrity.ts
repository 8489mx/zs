import { AppError } from '../errors/app-error';

export type FlowItem = {
  productId: number;
  qty: number;
  unitMultiplier?: number;
};

export type PaymentEntry = {
  paymentChannel: 'cash' | 'card';
  amount: number;
};

export function roundMoney(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

export function roundQty(value: number): number {
  return Number(Number(value || 0).toFixed(3));
}

export function ensureUniqueFlowItems(items: FlowItem[], code: string, message: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${Number(item.productId)}::${Number(item.unitMultiplier || 1)}`;
    if (seen.has(key)) throw new AppError(message, code, 400);
    seen.add(key);
  }
}

export function ensureNonNegativeStock(afterQty: number, code = 'INSUFFICIENT_STOCK', message = 'Stock cannot go negative'): void {
  if (roundQty(afterQty) < 0) throw new AppError(message, code, 400);
}

export function ensureReturnQtyWithinLimit(requestedQty: number, alreadyReturnedQty: number, invoiceQty: number): void {
  const requested = roundQty(requestedQty);
  const alreadyReturned = roundQty(alreadyReturnedQty);
  const soldOrPurchased = roundQty(invoiceQty);
  if (requested <= 0) {
    throw new AppError('Return quantity must be greater than zero', 'RETURN_QTY_INVALID', 400);
  }
  if (requested + alreadyReturned > soldOrPurchased + 0.0001) {
    throw new AppError('Return quantity exceeds the remaining quantity on the invoice', 'RETURN_QTY_EXCEEDED', 400);
  }
}

export function validateSalePayments(params: {
  paymentType: 'cash' | 'credit';
  collectibleTotal: number;
  payments: PaymentEntry[];
}): { paidAmount: number } {
  const collectibleTotal = roundMoney(params.collectibleTotal);
  const payments = params.payments || [];

  if (params.paymentType === 'credit') {
    if (payments.length) {
      throw new AppError('Credit sale must not include immediate payment rows', 'CREDIT_PAYMENTS_NOT_ALLOWED', 400);
    }
    return { paidAmount: 0 };
  }

  for (const payment of payments) {
    if (roundMoney(payment.amount) <= 0) {
      throw new AppError('Payment amount must be greater than zero', 'PAYMENT_AMOUNT_INVALID', 400);
    }
  }

  const paidAmount = roundMoney(payments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
  if (paidAmount + 0.0001 < collectibleTotal) {
    throw new AppError('Cash/card payments must cover the collectible total', 'PAYMENT_AMOUNT_INSUFFICIENT', 400);
  }
  return { paidAmount };
}
