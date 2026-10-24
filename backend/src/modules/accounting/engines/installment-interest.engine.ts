/** Effective-interest allocation of fixed monthly repayments, preserving the final cent. */
export function allocateInstallmentInterest(principal: number, payments: number[], totalInterest: number): number[] {
  if (!Number.isFinite(principal) || principal <= 0 || !payments.length || payments.some(p => !Number.isFinite(p) || p <= 0) || !Number.isFinite(totalInterest) || totalInterest < 0) throw new Error('Invalid financing terms');
  const interestCents = Math.round(totalInterest * 100);
  if (Math.round(payments.reduce((sum, payment) => sum + payment, 0) * 100) !== Math.round(principal * 100) + interestCents) throw new Error('Financing schedule does not reconcile');
  if (!interestCents) return payments.map(() => 0);
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
  let remaining = interestCents;
  return payments.map((payment, index) => {
    const cents = index === payments.length - 1 ? remaining : Math.min(remaining, Math.max(0, Math.round(outstanding * rate * 100)));
    remaining -= cents;
    outstanding = Math.max(0, outstanding + cents / 100 - payment);
    return cents / 100;
  });
}
