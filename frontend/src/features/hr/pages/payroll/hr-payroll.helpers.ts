import type { HrEmployee, HrPayrollRunItem } from '@/types/domain';

export type PayrollReviewStatus = 'all' | 'needs_review' | 'ready' | 'approved' | 'paid';

export const reviewStatusOptions: Array<{ value: PayrollReviewStatus; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'needs_review', label: 'يحتاج مراجعة' },
  { value: 'ready', label: 'جاهز' },
  { value: 'approved', label: 'معتمد' },
  { value: 'paid', label: 'ط…دفوع' },
];

export function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

export function text(value: unknown) {
  return String(value || '').trim() || '—';
}

export function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function statusLabel(value: unknown) {
  const status = normalize(value);
  if (status === 'draft') return 'مسودة / بانتظار المراجعة';
  if (status === 'reviewed') return 'جاهز';
  if (status === 'approved') return 'معتمد';
  if (status === 'paid') return 'ط…دفوع';
  if (status === 'cancelled' || status === 'canceled') return 'ملغي';
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
  return `غياب ${Number(row.attendanceAbsentDays || 0)} / تأخير ${Number(row.attendanceLateDays || 0)} / نصف يوم ${Number(row.attendanceHalfDays || 0)} / انصراف مبكر ${Number(row.attendanceEarlyLeaveDays || 0)}`;
}

export function reviewLeavesText(row: HrPayrollRunItem) {
  return `معتمدة ${Number(row.approvedLeaveDays || 0)} / غير مدفوعة ${Number(row.unpaidLeaveDays || 0)}`;
}

export function reviewFlagText(row: HrPayrollRunItem) {
  const flags: string[] = [];
  if (Number(row.unpaidLeaveDays || 0) > 0) flags.push('إجازة غير مدفوعة');
  if (Number(row.loanDeductionAmount || 0) > 0) flags.push('سلف/أقساط');
  if (Number(row.deductionAmount || 0) > 0) flags.push('خصومات');
  if (Number(row.attendanceAbsentDays || 0) > 0 || Number(row.attendanceHalfDays || 0) > 0 || Number(row.attendanceEarlyLeaveDays || 0) > 0) flags.push('استثناء حضور');
  if (Number(row.baseSalary || 0) <= 0) flags.push('راتب أساسي غير مكتمل');
  return flags.length ? flags.join('، ') : 'جاهز';
}
