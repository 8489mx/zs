/** Calendar accounting dates are UTC days; report end bounds are exclusive. */
export function nextAccountingDay(value: string | Date): Date {
  const day = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
    throw new Error('Invalid accounting calendar date');
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}
