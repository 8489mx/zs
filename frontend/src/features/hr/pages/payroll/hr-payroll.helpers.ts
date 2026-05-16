import type { HrEmployee, HrPayrollRunItem } from '@/types/domain';

export type PayrollReviewStatus = 'all' | 'needs_review' | 'ready' | 'approved' | 'paid';

export const reviewStatusOptions: Array<{ value: PayrollReviewStatus; label: string }> = [
  { value: 'all', label: 'ط§ظ„ظƒظ„' },
  { value: 'needs_review', label: 'ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©' },
  { value: 'ready', label: 'ط¬ط§ظ‡ط²' },
  { value: 'approved', label: 'ظ…ط¹طھظ…ط¯' },
  { value: 'paid', label: 'ط…ط¯ظپظˆط¹' },
];

export function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ط¬.ظ…';
  return `${amount.toFixed(2)} ط¬.ظ…`;
}

export function text(value: unknown) {
  return String(value || '').trim() || 'â€”';
}

export function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function statusLabel(value: unknown) {
  const status = normalize(value);
  if (status === 'draft') return 'ظ…ط³ظˆط¯ط© / ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ…ط±ط§ط¬ط¹ط©';
  if (status === 'reviewed') return 'ط¬ط§ظ‡ط²';
  if (status === 'approved') return 'ظ…ط¹طھظ…ط¯';
  if (status === 'paid') return 'ط…ط¯ظپظˆط¹';
  if (status === 'cancelled' || status === 'canceled') return 'ظ…ظ„ط؛ظٹ';
  return text(value);
}

export function itemNeedsReview(row: HrPayrollRunItem) {
  return (
    Number(row.unpaidLeaveDays || 0) > 0
    || Number(row.loanDeductionAmount || 0) > 0
    || Number(row.deductionAmount || 0) > 0
    || Number(row.suggestedAttendanceDeductionAmount || 0) > 0
    || Number(row.suggestedLeaveDeductionAmount || 0) > 0
    || Number(row.attendanceAbsentDays || 0) > 0
    || Number(row.attendanceHalfDays || 0) > 0
    || Number(row.attendanceEarlyLeaveDays || 0) > 0
    || !Number.isFinite(Number(row.baseSalary || 0))
    || Number(row.baseSalary || 0) <= 0
  );
}

export function employeeMatches(row: HrPayrollRunItem, employeesMap: Map<string, HrEmployee>, searchTerm: string, department: string) {
  const employee = employeesMap.get(String(row.employeeId));
  const departmentName = normalize(employee?.departmentName || '');
  const rowDepartment = normalize((row as { departmentName?: string }).departmentName || '');

  if (department !== 'all' && departmentName !== department && rowDepartment !== department) {
    return false;
  }

  if (!searchTerm) return true;

  const haystack = [
    row.employeeName,
    row.employeeNo,
    row.employeeId,
    employee?.firstName,
    employee?.lastName,
    employee?.displayName,
    employee?.employeeNo,
  ].map((value) => normalize(value)).join(' ');

  return haystack.includes(searchTerm);
}

export function reviewAttendanceText(row: HrPayrollRunItem) {
  return `ط؛ظٹط§ط¨ ${Number(row.attendanceAbsentDays || 0)} / طھط£ط®ظٹط± ${Number(row.attendanceLateDays || 0)} / ظ†طµظپ ظٹظˆظ… ${Number(row.attendanceHalfDays || 0)} / ط§ظ†طµط±ط§ظپ ظ…ط¨ظƒط± ${Number(row.attendanceEarlyLeaveDays || 0)}`;
}

export function reviewLeavesText(row: HrPayrollRunItem) {
  return `ظ…ط¹طھظ…ط¯ط© ${Number(row.approvedLeaveDays || 0)} / ط؛ظٹط± ظ…ط¯ظپظˆط¹ط© ${Number(row.unpaidLeaveDays || 0)}`;
}

export function reviewFlagText(row: HrPayrollRunItem) {
  const flags: string[] = [];
  if (Number(row.unpaidLeaveDays || 0) > 0) flags.push('ط¥ط¬ط§ط²ط© ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©');
  if (Number(row.loanDeductionAmount || 0) > 0) flags.push('ط³ظ„ظپ/ط£ظ‚ط³ط§ط·');
  if (Number(row.deductionAmount || 0) > 0) flags.push('ط®طµظˆظ…ط§طھ');
  if (Number(row.attendanceAbsentDays || 0) > 0 || Number(row.attendanceHalfDays || 0) > 0 || Number(row.attendanceEarlyLeaveDays || 0) > 0) flags.push('ط§ط³طھط«ظ†ط§ط، ط­ط¶ظˆط±');
  if (Number(row.baseSalary || 0) <= 0) flags.push('ط±ط§طھط¨ ط£ط³ط§ط³ظٹ ط؛ظٹط± ظ…ظƒطھظ…ظ„');
  return flags.length ? flags.join('طŒ ') : 'ط¬ط§ظ‡ط²';
}
