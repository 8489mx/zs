import type { HrContact, HrEmployee } from '@/types/domain';

export function fallbackText(value: unknown) {
  return String(value || '').trim() || 'â€”';
}

export function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'â€”';
  return `${amount.toFixed(2)} ط¬.ظ…`;
}

export function statusLabel(status: unknown) {
  const value = String(status || '').trim();
  if (value === 'active') return 'ظ†ط´ط·';
  if (value === 'inactive') return 'ط؛ظٹط± ظ†ط´ط·';
  if (value === 'deactivated') return 'ظ…ظˆظ‚ظˆظپ';
  if (value === 'terminated') return 'ظ…ظ†طھظ‡ظٹ ط§ظ„ط®ط¯ظ…ط©';
  return 'ط؛ظٹط± ظ…ط­ط¯ط¯';
}

export function maskNationalId(nationalId: unknown) {
  const value = String(nationalId || '').trim();
  if (!/^\d{14}$/.test(value)) return 'ط؛ظٹط± ظ…ط³ط¬ظ„';
  return `**********${value.slice(-4)}`;
}

export function pickPrimaryPhone(contacts: HrContact[]) {
  const phone = contacts.find((entry) => String(entry.contactType || '').toLowerCase() === 'phone' && entry.isPrimary)
    || contacts.find((entry) => String(entry.contactType || '').toLowerCase() === 'phone')
    || contacts[0];
  return phone ? fallbackText(phone.value) : 'ط؛ظٹط± ظ…ط³ط¬ظ„';
}

export function employeeName(employee?: HrEmployee) {
  if (!employee) return 'ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ';
  return fallbackText(employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()) || 'ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ';
}

export function normalizeDateOnly(value: unknown) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}
