export function toId(value: string) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export function text(value: unknown) {
  return String(value || '').trim() || '—';
}

export function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function isActiveValue(value: unknown) {
  return value !== false;
}

export function statusLabel(isActive: unknown) {
  return isActiveValue(isActive) ? 'نشط' : 'غير نشط';
}

export function paidLabel(value: unknown) {
  if (value === true) return 'مدفوعة';
  if (value === false) return 'غير مدفوعة';
  return 'غير متاح';
}

export function stats(rows: Array<{ isActive?: boolean }>) {
  const total = rows.length;
  const active = rows.filter((row) => isActiveValue(row.isActive)).length;
  const inactive = Math.max(0, total - active);
  return { total, active, inactive };
}
