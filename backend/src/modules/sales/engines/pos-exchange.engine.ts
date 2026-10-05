import { AppError } from '../../../common/errors/app-error';

/** All exchange settlement is performed in whole minor currency units. */
export function settlePosExchange(returnTotal: number, saleTotal: number): {
  appliedCredit: number; refundAmount: number; collectibleAmount: number;
} {
  const cents = (amount: number) => {
    const value = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(value) || Math.abs(amount * 100 - value) > 0.001) {
      throw new AppError('قيمة الاستبدال غير صالحة', 'EXCHANGE_AMOUNT_INVALID', 422);
    }
    return value;
  };
  const returned = cents(returnTotal);
  const sold = cents(saleTotal);
  return {
    appliedCredit: Math.min(returned, sold) / 100,
    refundAmount: Math.max(0, returned - sold) / 100,
    collectibleAmount: Math.max(0, sold - returned) / 100,
  };
}
