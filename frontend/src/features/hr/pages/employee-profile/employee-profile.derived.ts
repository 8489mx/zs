import type { HrContract, HrDocument, HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan } from '@/types/domain';
import { documentStatusLabel, maskNationalId, normalizeText, pickPrimaryPhone } from '@/features/hr/utils/employee-profile.helpers';

export function buildEmployeeProfileDerivedData(args: {
  employee: HrEmployee | undefined;
  contacts: Array<{ contactType?: string; isPrimary?: boolean; value?: string }>;
  documents: HrDocument[];
  contracts: HrContract[];
  loans: HrLoan[];
  leaveRequests: HrLeaveRequest[];
  employeeAssets: HrEmployeeAsset[];
}) {
  const { employee, contacts, documents, contracts, loans, leaveRequests, employeeAssets } = args;
  const latestContract = contracts[0];
  const primaryPhone = pickPrimaryPhone(contacts as never);
  const nationalIdMasked = maskNationalId(employee?.nationalId);

  const documentStats = documents.reduce((acc, row) => {
    const label = documentStatusLabel(row.expiryDate);
    if (label === 'ساري') acc.valid += 1;
    if (label === 'قريب الانتهاء') acc.nearExpiry += 1;
    if (label === 'منتهي') acc.expired += 1;
    if (label === 'بدون تاريخ انتهاء') acc.noExpiry += 1;
    return acc;
  }, { valid: 0, nearExpiry: 0, expired: 0, noExpiry: 0 });

  const openLoans = loans.filter((row) => Number(row.remainingAmount || 0) > 0);
  const openLoansCount = openLoans.length;
  const openLoansRemaining = openLoans.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);

  const pendingLeavesCount = leaveRequests.filter((row) => normalizeText(row.status) === 'pending').length;
  const approvedLeavesCount = leaveRequests.filter((row) => normalizeText(row.status) === 'approved').length;
  const unpaidLeavesCount = leaveRequests.filter((row) => {
    const typeName = normalizeText(row.leaveTypeName || row.leaveType);
    return normalizeText(row.status) === 'approved' && (typeName.includes('بدون') || typeName.includes('unpaid'));
  }).length;

  const problematicAssetsCount = employeeAssets.filter((row) => {
    const status = normalizeText(row.status);
    return status === 'damaged' || status === 'lost';
  }).length;

  const basicComplete = Boolean(String(employee?.firstName || '').trim() && String(employee?.hireDate || '').trim());
  const mobileComplete = primaryPhone !== 'غير مسجل';
  const nationalIdComplete = nationalIdMasked !== 'غير مسجل';
  const deptTitleComplete = Boolean(normalizeText(employee?.departmentName) || normalizeText(employee?.jobTitleName));
  const contractSalaryComplete = Boolean(latestContract && Number(latestContract.baseSalary || 0) > 0);
  const documentsComplete = documents.length > 0;
  const assetsComplete = employeeAssets.length > 0;

  const completenessRows = [
    { label: 'البيانات الأساسية', state: basicComplete ? 'مكتمل' : 'ناقص' },
    { label: 'الموبايل', state: mobileComplete ? 'مكتمل' : 'ناقص' },
    { label: 'الرقم القومي', state: nationalIdComplete ? 'مكتمل' : 'ناقص' },
    { label: 'القسم / المسمى الوظيفي', state: deptTitleComplete ? 'مكتمل' : 'ناقص' },
    { label: 'العقد / الراتب', state: contractSalaryComplete ? 'مكتمل' : (contracts.length ? 'يحتاج مراجعة' : 'ناقص') },
    { label: 'المستندات', state: documentsComplete ? (documentStats.expired || documentStats.nearExpiry ? 'يحتاج مراجعة' : 'مكتمل') : 'ناقص' },
    { label: 'العُهد', state: assetsComplete ? (problematicAssetsCount ? 'يحتاج مراجعة' : 'مكتمل') : 'ناقص' },
  ];

  const reviewAlerts: string[] = [];
  if (!nationalIdComplete) reviewAlerts.push('الرقم القومي غير مسجل.');
  if (!mobileComplete) reviewAlerts.push('الموبايل غير مسجل.');
  if (!deptTitleComplete) reviewAlerts.push('لا يوجد قسم أو مسمى وظيفي.');
  if (!contractSalaryComplete) reviewAlerts.push('لا يوجد عقد أو راتب مكتمل.');
  if (documentStats.expired > 0) reviewAlerts.push(`يوجد ${documentStats.expired} مستند منتهي.`);
  if (documentStats.nearExpiry > 0) reviewAlerts.push(`يوجد ${documentStats.nearExpiry} مستند قريب الانتهاء.`);
  if (problematicAssetsCount > 0) reviewAlerts.push('توجد عهدة تالفة أو مفقودة تحتاج متابعة.');
  if (unpaidLeavesCount > 0) reviewAlerts.push('توجد إجازة غير مدفوعة قد تحتاج مراجعة في الراتب.');
  if (openLoansCount > 0) reviewAlerts.push('توجد سلفة أو قسط مفتوح يحتاج متابعة.');

  return {
    latestContract,
    primaryPhone,
    nationalIdMasked,
    documentStats,
    openLoansCount,
    openLoansRemaining,
    pendingLeavesCount,
    approvedLeavesCount,
    unpaidLeavesCount,
    completenessRows,
    reviewAlerts,
  };
}
