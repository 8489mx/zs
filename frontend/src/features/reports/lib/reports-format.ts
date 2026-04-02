export function buildRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function buildTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  return { from: start.toISOString(), to: end.toISOString() };
}

export function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeInputValue(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function relativePercent(value: number, values: number[]) {
  const maxValue = Math.max(...values.map((entry) => Math.abs(Number(entry || 0))), 1);
  return Math.max(8, Math.round((Math.abs(Number(value || 0)) / maxValue) * 100));
}

export const integerFormatter = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value || 0);
