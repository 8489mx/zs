/** Advance a calendar month while keeping an end-of-month due date in that month. */
export function advanceDueDate(date: string, monthsAhead: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + monthsAhead, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

export function buildAdvanceSchedule(amount: number, months: number, issueDate: string): Array<{
  installmentNo: number; dueDate: string; amount: number;
}> {
  const totalCents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(months) || months < 1 || months > 120 ||
      totalCents < months || Math.abs(amount * 100 - totalCents) > 0.000001) {
    throw new Error('Invalid advance amount or installment count');
  }
  const baseCents = Math.floor(totalCents / months);
  return Array.from({ length: months }, (_, index) => ({
    installmentNo: index + 1,
    dueDate: advanceDueDate(issueDate, index + 1),
    amount: (index === months - 1 ? totalCents - baseCents * (months - 1) : baseCents) / 100,
  }));
}
