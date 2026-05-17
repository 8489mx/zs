import type { HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan, HrPayrollRun } from '@/types/domain';
import { normalize, text } from '@/features/hr/pages/reports/hr-reports.helpers';

export const reportSectionCardClassName = 'hr-report-section-card';

export function employeeName(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

export function isActiveEmployee(row: HrEmployee) {
  return normalize(row.status) === 'active';
}

export function isMissingEmployeeBasics(row: HrEmployee) {
  return !normalize(row.nationalId) || !normalize(row.departmentName) || !normalize(row.jobTitleName) || !normalize(row.hireDate);
}

export function isOpenLoan(row: HrLoan) {
  const status = normalize(row.status);
  return Number(row.remainingAmount || 0) > 0 && status !== 'cancelled' && status !== 'repaid' && status !== 'paid';
}

export function hasDueLoan(row: HrLoan) {
  return Number(row.dueInstallmentsAmount || 0) > 0 || Number(row.dueInstallmentsCount || 0) > 0;
}

export function needsAssetReview(row: HrEmployeeAsset) {
  const status = normalize(row.status);
  return status === 'damaged' || status === 'lost' || (status === 'assigned' && !normalize(row.assignedAt));
}

export function isOpenAsset(row: HrEmployeeAsset) {
  const status = normalize(row.status);
  return status === 'assigned' || status === 'damaged' || status === 'lost';
}

export function leaveNeedsReview(row: HrLeaveRequest) {
  return normalize(row.status) === 'pending';
}

export function isUnpaidLeave(row: HrLeaveRequest) {
  const typeText = normalize(row.leaveTypeName || row.leaveType || row.notes || row.reason);
  return typeText.includes('غير مدفوعة') || typeText.includes('unpaid');
}

export function payrollRunNeedsReview(row: HrPayrollRun) {
  const status = normalize(row.status);
  return status === 'draft' || status === 'reviewed';
}
