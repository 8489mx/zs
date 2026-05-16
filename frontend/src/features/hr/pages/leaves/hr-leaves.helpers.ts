import type { HrEmployee } from '@/types/domain';

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function text(value: unknown) {
  return String(value || '').trim();
}

export function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[\u0660-\u0669]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeDecimal(value: string) {
  return normalizeArabicDigits(value).replace(/[طŒ,]/g, '.').trim();
}

export function toDateOnly(value: string) {
  return text(value).slice(0, 10);
}

export function employeeDisplay(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || 'â€”';
}

export function calculateInclusiveDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return '';
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return '';
  const days = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return String(days);
}

export function leaveStatusLabel(value: unknown) {
  const status = text(value);
  if (status === 'pending') return 'ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©';
  if (status === 'approved') return 'ظ…ط¹طھظ…ط¯ط©';
  if (status === 'rejected') return 'ظ…ط±ظپظˆط¶ط©';
  if (status === 'cancelled') return 'ظ…ظ„ط؛ط§ط©';
  return status || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
}
