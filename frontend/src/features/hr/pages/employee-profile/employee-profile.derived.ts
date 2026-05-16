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
    return normalizeText(row.status) === 'approved' && (typeName.includes('ط¨ط¯ظˆظ†') || typeName.includes('unpaid'));
  }).length;

  const problematicAssetsCount = employeeAssets.filter((row) => {
    const status = normalizeText(row.status);
    return status === 'damaged' || status === 'lost';
  }).length;

  const basicComplete = Boolean(String(employee?.firstName || '').trim() && String(employee?.hireDate || '').trim());
  const mobileComplete = primaryPhone !== 'ط؛ظٹط± ظ…ط³ط¬ظ„';
  const nationalIdComplete = nationalIdMasked !== 'ط؛ظٹط± ظ…ط³ط¬ظ„';
  const deptTitleComplete = Boolean(normalizeText(employee?.departmentName) || normalizeText(employee?.jobTitleName));
  const contractSalaryComplete = Boolean(latestContract && Number(latestContract.baseSalary || 0) > 0);
  const documentsComplete = documents.length > 0;
  const assetsComplete = employeeAssets.length > 0;

  const completenessRows = [
    { label: 'ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©', state: basicComplete ? 'ظ…ظƒطھظ…ظ„' : 'ظ†ط§ظ‚طµ' },
    { label: 'ط§ظ„ظ…ظˆط¨ط§ظٹظ„', state: mobileComplete ? 'ظ…ظƒطھظ…ظ„' : 'ظ†ط§ظ‚طµ' },
    { label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ', state: nationalIdComplete ? 'ظ…ظƒطھظ…ظ„' : 'ظ†ط§ظ‚طµ' },
    { label: 'ط§ظ„ظ‚ط³ظ… / ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ', state: deptTitleComplete ? 'ظ…ظƒطھظ…ظ„' : 'ظ†ط§ظ‚طµ' },
    { label: 'ط§ظ„ط¹ظ‚ط¯ / ط§ظ„ط±ط§طھط¨', state: contractSalaryComplete ? 'ظ…ظƒطھظ…ظ„' : (contracts.length ? 'ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©' : 'ظ†ط§ظ‚طµ') },
    { label: 'ط§ظ„ظ…ط³طھظ†ط¯ط§طھ', state: documentsComplete ? (documentStats.expired || documentStats.nearExpiry ? 'ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©' : 'ظ…ظƒطھظ…ظ„') : 'ظ†ط§ظ‚طµ' },
    { label: 'ط§ظ„ط¹ظڈظ‡ط¯', state: assetsComplete ? (problematicAssetsCount ? 'ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©' : 'ظ…ظƒطھظ…ظ„') : 'ظ†ط§ظ‚طµ' },
  ];

  const reviewAlerts: string[] = [];
  if (!nationalIdComplete) reviewAlerts.push('ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ ط؛ظٹط± ظ…ط³ط¬ظ„.');
  if (!mobileComplete) reviewAlerts.push('ط§ظ„ظ…ظˆط¨ط§ظٹظ„ ط؛ظٹط± ظ…ط³ط¬ظ„.');
  if (!deptTitleComplete) reviewAlerts.push('ظ„ط§ ظٹظˆط¬ط¯ ظ‚ط³ظ… ط£ظˆ ظ…ط³ظ…ظ‰ ظˆط¸ظٹظپظٹ.');
  if (!contractSalaryComplete) reviewAlerts.push('ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ‚ط¯ ط£ظˆ ط±ط§طھط¨ ظ…ظƒطھظ…ظ„.');
  if (documentStats.expired > 0) reviewAlerts.push(`ظٹظˆط¬ط¯ ${documentStats.expired} ظ…ط³طھظ†ط¯ ظ…ظ†طھظ‡ظٹ.`);
  if (documentStats.nearExpiry > 0) reviewAlerts.push(`ظٹظˆط¬ط¯ ${documentStats.nearExpiry} ظ…ط³طھظ†ط¯ ظ‚ط±ظٹط¨ ط§ظ„ط§ظ†طھظ‡ط§ط،.`);
  if (problematicAssetsCount > 0) reviewAlerts.push('طھظˆط¬ط¯ ط¹ظ‡ط¯ط© طھط§ظ„ظپط© ط£ظˆ ظ…ظپظ‚ظˆط¯ط© طھط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©.');
  if (unpaidLeavesCount > 0) reviewAlerts.push('طھظˆط¬ط¯ ط¥ط¬ط§ط²ط© ط؛ظٹط± ظ…ط¯ظپظˆط¹ط© ظ‚ط¯ طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ظپظٹ ط§ظ„ط±ط§طھط¨.');
  if (openLoansCount > 0) reviewAlerts.push('طھظˆط¬ط¯ ط³ظ„ظپط© ط£ظˆ ظ‚ط³ط· ظ…ظپطھظˆط­ ظٹط­طھط§ط¬ ظ…طھط§ط¨ط¹ط©.');

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
