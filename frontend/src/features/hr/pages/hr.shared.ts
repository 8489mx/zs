import type { HrEmployee } from '@/types/domain';

export function formValue(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

export function numericFormValue(form: FormData, key: string) {
  const value = Number(form.get(key) || 0);
  return value > 0 ? value : undefined;
}

export function normalizeEmployeeNoInput(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutLegacyPrefix = raw.replace(/^EMP-?/i, '');
  if (!/^\d+$/.test(withoutLegacyPrefix)) return '';
  const numeric = Number(withoutLegacyPrefix);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return '';
  return String(numeric).padStart(3, '0');
}

export function normalizeDateInput(value?: string | null) {
  const text = String(value || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return '';
}

export function formatHrMoney(value: unknown) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} ج.م`;
}

export function findCreatedEmployee(response: unknown, payload: { employeeNo?: string; firstName: string; lastName?: string }) {
  const responseEmployees = ((response as { employees?: HrEmployee[] })?.employees || []) as HrEmployee[];
  return responseEmployees.find((employee) => (
    payload.employeeNo && employee.employeeNo === payload.employeeNo
  )) || responseEmployees.find((employee) => (
    employee.firstName === payload.firstName && String(employee.lastName || '') === String(payload.lastName || '')
  )) || responseEmployees[0];
}
