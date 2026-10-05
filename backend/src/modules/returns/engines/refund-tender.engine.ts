import { AppError } from '../../../common/errors/app-error';

export type RefundTender = 'cash' | 'card' | 'store_credit' | 'receivable';

export function allocateRefundTenders(input: {
  requested: 'cash' | 'card' | 'store_credit';
  amount: number;
  originalCashPaid: number;
  originalNonCashPaid: number;
  originalDebt: number;
  previousCashRefunded: number;
  previousNonCashRefunded: number;
  previousDebtReversed: number;
  hasCustomer: boolean;
  override?: boolean;
  overrideReason?: string;
}): Array<{ tender: RefundTender; amount: number }> {
  const toCents = (value: number): number => {
    const rounded = Math.round(Number(value) * 100);
    if (!Number.isSafeInteger(rounded) || rounded < 0 || Math.abs(Number(value) * 100 - rounded) > 0.001) {
      throw new AppError('Refund amounts require cent precision', 'INVALID_REFUND_AMOUNT', 400);
    }
    return rounded;
  };
  let remaining = toCents(input.amount);
  if (remaining <= 0) throw new AppError('Refund amount must be positive', 'INVALID_REFUND_AMOUNT', 400);
  if (input.requested === 'store_credit') {
    if (!input.hasCustomer) throw new AppError('Store credit requires a customer', 'REFUND_CUSTOMER_REQUIRED', 400);
    return [{ tender: 'store_credit', amount: remaining / 100 }];
  }
  const result: Array<{ tender: RefundTender; amount: number }> = [];
  const apply = (tender: RefundTender, available: number): void => {
    const used = Math.min(remaining, Math.max(0, available));
    if (used > 0) result.push({ tender, amount: used / 100 });
    remaining -= used;
  };
  const debtAvailable = Math.max(0, toCents(input.originalDebt) - toCents(input.previousDebtReversed));
  if (debtAvailable > 0 && !input.hasCustomer) throw new AppError('Credit return requires a customer', 'REFUND_CUSTOMER_REQUIRED', 400);
  apply('receivable', debtAvailable);
  if (remaining === 0) return result;
  if (input.override) {
    if (String(input.overrideReason || '').trim().length < 10) {
      throw new AppError('سبب تجاوز وسيلة الاسترداد يجب أن يكون 10 أحرف على الأقل', 'REFUND_OVERRIDE_REASON_REQUIRED', 400);
    }
    apply(input.requested, remaining);
    return result;
  }
  const cashAvailable = Math.max(0, toCents(input.originalCashPaid) - toCents(input.previousCashRefunded));
  const nonCashAvailable = Math.max(0, toCents(input.originalNonCashPaid) - toCents(input.previousNonCashRefunded));
  if (input.requested === 'cash') {
    apply('cash', cashAvailable);
    apply('card', nonCashAvailable);
  } else {
    apply('card', nonCashAvailable);
    apply('cash', cashAvailable);
  }
  if (remaining > 0) {
    if (!input.hasCustomer) throw new AppError('المتبقي يحتاج رصيد متجر مرتبطاً بعميل', 'REFUND_CUSTOMER_REQUIRED', 400);
    apply('store_credit', remaining);
  }
  return result;
}
