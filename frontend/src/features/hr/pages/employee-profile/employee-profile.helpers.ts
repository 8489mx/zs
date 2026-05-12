import type { HrContact, HrEmployee } from '@/types/domain';

export function fallbackText(value: unknown) {
  return String(value || '').trim() || '—';
}

export function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toFixed(2)} ج.م`;
}

export function statusLabel(status: unknown) {
  const value = String(status || '').trim();
  if (value === 'active') return 'نشط';
  if (value === 'inactive') return 'غير نشط';
  if (value === 'deactivated') return 'موقوف';
  if (value === 'terminated') return 'منتهي الخدمة';
  return 'غير محدد';
}

export function maskNationalId(nationalId: unknown) {
  const value = String(nationalId || '').trim();
  if (!/^\d{14}$/.test(value)) return 'غير مسجل';
  return `**********${value.slice(-4)}`;
}

export function pickPrimaryPhone(contacts: HrContact[]) {
  const phone = contacts.find((entry) => String(entry.contactType || '').toLowerCase() === 'phone' && entry.isPrimary)
    || contacts.find((entry) => String(entry.contactType || '').toLowerCase() === 'phone')
    || contacts[0];
  return phone ? fallbackText(phone.value) : 'غير مسجل';
}

export function employeeName(employee?: HrEmployee) {
  if (!employee) return 'ملف الموظف';
  return fallbackText(employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()) || 'ملف الموظف';
}

export function normalizeDateOnly(value: unknown) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}
