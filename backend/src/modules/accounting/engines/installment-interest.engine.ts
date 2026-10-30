import { MoneyDigits, toMinorUnits, fromMinorUnits } from './money-minor-units.engine';

/**
 * Effective-interest allocation of fixed monthly repayments, preserving the final minor unit.
 *
 * INV-INSTALLMENT-INTEREST-PRECISION: the allocation runs entirely in the tenant's
 * minor units (required `minorUnits`, never a hard-coded 2), so the allocation rows
 * sum to exactly the interest the journal leg posts. The old cents-based version
 * rounded a KWD 7.125 interest to 7.13 for the allocation rows while the journal
 * leg was exact at 7.125; recognition then debited the 2155 deferred account by
 * 7.13 against a 7.125 credit, leaking 0.005 per plan into a permanently
 * over-released deferred balance. The last installment still absorbs the
 * remainder, so the sum is exact at any precision.
 */
export function allocateInstallmentInterest(principal: number, payments: number[], totalInterest: number, minorUnits: MoneyDigits): number[] {
  if (!Number.isFinite(principal) || principal <= 0 || !payments.length || payments.some(p => !Number.isFinite(p) || p <= 0) || !Number.isFinite(totalInterest) || totalInterest < 0) throw new Error('Invalid financing terms');
  const factor = 10 ** minorUnits;
  const interestMinor = toMinorUnits(totalInterest, minorUnits);
  if (payments.reduce((sum, payment) => sum + toMinorUnits(payment, minorUnits), 0) !== toMinorUnits(principal, minorUnits) + interestMinor) throw new Error('Financing schedule does not reconcile');
  if (!interestMinor) return payments.map(() => 0);
  const presentValue = (rate: number) => payments.reduce((sum, payment, index) => sum + payment / Math.pow(1 + rate, index + 1), 0);
  let low = 0;
  let high = 1;
  while (presentValue(high) > principal) high *= 2;
  for (let iteration = 0; iteration < 100; iteration++) {
    const middle = (low + high) / 2;
    if (presentValue(middle) > principal) low = middle;
    else high = middle;
  }
  const rate = (low + high) / 2;
  let outstanding = principal;
  let remaining = interestMinor;
  return payments.map((payment, index) => {
    const minor = index === payments.length - 1 ? remaining : Math.min(remaining, Math.max(0, Math.round(outstanding * rate * factor)));
    remaining -= minor;
    outstanding = Math.max(0, outstanding + minor / factor - payment);
    return fromMinorUnits(minor, minorUnits);
  });
}
