export function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toIsoUtc(date: Date) {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  )).toISOString();
}

export function dayRangeLast30(referenceDate?: Date) {
  const end = referenceDate ? new Date(referenceDate) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { from: toIsoUtc(start), to: toIsoUtc(end) };
}
