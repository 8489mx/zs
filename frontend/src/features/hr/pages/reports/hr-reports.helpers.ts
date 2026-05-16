import type { HrEmployee } from '@/types/domain';

export type ReportType = 'all' | 'employees' | 'attendance' | 'leaves' | 'payroll' | 'alerts';

export const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: 'all', label: 'ط§ظ„ظƒظ„' },
  { value: 'employees', label: 'ط§ظ„ظ…ظˆط¸ظپظٹظ†' },
  { value: 'attendance', label: 'ط§ظ„ط­ط¶ظˆط±' },
  { value: 'leaves', label: 'ط§ظ„ط¥ط¬ط§ط²ط§طھ' },
  { value: 'payroll', label: 'ط§ظ„ظ…ط±طھط¨ط§طھ' },
  { value: 'alerts', label: 'ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ' },
];

export function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'ط؛ظٹط± ظ…طھط§ط­';
  return `${amount.toFixed(2)} ط¬.ظ…`;
}

export function countText(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'ط؛ظٹط± ظ…طھط§ط­';
  return String(amount);
}

export function text(value: unknown) {
  return String(value || '').trim() || 'â€”';
}

export function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartDate() {
  return `${todayDate().slice(0, 7)}-01`;
}

export function employeeMatches(employee: HrEmployee, search: string, department: string) {
  const searchTerm = normalize(search);
  const departmentName = normalize(employee.departmentName);

  if (department !== 'all' && departmentName !== department) return false;

  if (!searchTerm) return true;
  const haystack = [
    employee.displayName,
    employee.firstName,
    employee.lastName,
    employee.employeeNo,
    employee.nationalId,
    employee.departmentName,
    employee.jobTitleName,
  ].map((value) => normalize(value)).join(' ');

  return haystack.includes(searchTerm);
}
