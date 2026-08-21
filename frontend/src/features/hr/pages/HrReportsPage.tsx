import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan, HrPayrollRun } from '@/types/domain';
import {
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  WalletIcon,
  BriefcaseIcon,
  BanknotesIcon,
  AlertTriangleIcon,
} from '@/features/hr/components/HrIcons';
import {
  useHrAttendance,
  useHrEmployeeAssets,
  useHrLeaveRequests,
  useHrReportsSummary,
  useHrWorkspace,
} from '@/features/hr/hooks/useHr';
import { countText, employeeMatches, money, monthStartDate, normalize, reportTypeOptions, text, todayDate, type ReportType } from '@/features/hr/pages/reports/hr-reports.helpers';
import {
  employeeName,
  hasDueLoan,
  isActiveEmployee,
  isMissingEmployeeBasics,
  isOpenAsset,
  isOpenLoan,
  isUnpaidLeave,
  leaveNeedsReview,
  needsAssetReview,
  payrollRunNeedsReview,
} from '@/features/hr/pages/reports/hr-reports.page-helpers';

export function HrReportsPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(monthStartDate());
  const [to, setTo] = useState(todayDate());
  const [month, setMonth] = useState(todayDate().slice(0, 7));
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [reportType, setReportType] = useState<ReportType>('all');

  const summaryQuery = useHrReportsSummary({ from, to, month });
  const workspace = useHrWorkspace({ page: 1, pageSize: 300, search, month });
  const attendanceQuery = useHrAttendance({ from, to, page: 1, pageSize: 300, search });
  const leavesQuery = useHrLeaveRequests({ from, to, page: 1, pageSize: 300, search });
  const assetsQuery = useHrEmployeeAssets({ from, to, page: 1, pageSize: 300, search });

  const summary = summaryQuery.data?.summary;
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const payrollRuns = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const loans = useMemo(() => (workspace.loans.data?.loans || []) as HrLoan[], [workspace.loans.data?.loans]);
  const leaves = useMemo(() => (leavesQuery.data?.requests || []) as HrLeaveRequest[], [leavesQuery.data?.requests]);
  const assets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);
  const filteredEmployees = useMemo(() => employees.filter((employee) => employeeMatches(employee, search, departmentFilter)), [employees, search, departmentFilter]);
  const departmentOptions = useMemo(() => {
    const items = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (key) items.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(items.entries()).map(([value, label]) => ({ value, label }));
  }, [employees]);

  const employeesReport = useMemo(() => ({
    total: filteredEmployees.length,
    active: filteredEmployees.filter(isActiveEmployee).length,
    inactive: filteredEmployees.filter((employee) => !isActiveEmployee(employee)).length,
    missingBasics: filteredEmployees.filter(isMissingEmployeeBasics).length,
    missingNationalId: filteredEmployees.filter((employee) => !normalize(employee.nationalId)).length,
    missingDepartmentOrTitle: filteredEmployees.filter((employee) => !normalize(employee.departmentName) || !normalize(employee.jobTitleName)).length,
    missingWorkSchedule: filteredEmployees.filter((employee) => !normalize(employee.scheduledCheckInTime) || !normalize(employee.scheduledCheckOutTime)).length,
  }), [filteredEmployees]);
  const attendanceReport = useMemo(() => ({ total: countText(attendanceQuery.data?.summary?.totalItems), present: countText(summary?.attendance?.presentCount), absent: countText(summary?.attendance?.absentCount), late: countText(summary?.attendance?.lateCount), needsReview: countText(attendanceQuery.data?.summary?.unmarkedCount) }), [attendanceQuery.data?.summary?.totalItems, attendanceQuery.data?.summary?.unmarkedCount, summary?.attendance]);
  const leavesReport = useMemo(() => ({ total: countText(leavesQuery.data?.summary?.totalItems), pending: countText(summary?.leaves?.pendingCount ?? leaves.filter(leaveNeedsReview).length), approved: countText(summary?.leaves?.approvedCount), rejected: countText(summary?.leaves?.rejectedCount), unpaid: countText(summary?.leaves?.unpaidLeaveDays ?? leaves.filter(isUnpaidLeave).length) }), [leaves, leavesQuery.data?.summary?.totalItems, summary?.leaves]);
  const loansReport = useMemo(() => {
    const openLoans = loans.filter(isOpenLoan);
    const dueLoans = loans.filter(hasDueLoan);
    return { total: loans.length, open: openLoans.length, dueCount: dueLoans.length, dueAmount: dueLoans.reduce((sum, row) => sum + Number(row.dueInstallmentsAmount || 0), 0), remainingAmount: openLoans.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0) };
  }, [loans]);
  const assetsReport = useMemo(() => {
    const openAssets = assets.filter(isOpenAsset);
    const reviewAssets = assets.filter(needsAssetReview);
    return { total: assets.length, assigned: assets.filter((row) => normalize(row.status) === 'assigned').length, returned: assets.filter((row) => normalize(row.status) === 'returned').length, damaged: assets.filter((row) => normalize(row.status) === 'damaged').length, lost: assets.filter((row) => normalize(row.status) === 'lost').length, open: openAssets.length, needsReview: reviewAssets.length };
  }, [assets]);
  const payrollReport = useMemo(() => {
    const run = payrollRuns.find((item) => normalize(item.periodMonth) === normalize(month)) || payrollRuns[0];
    const runItems = run?.items || [];
    const needsReview = runItems.filter((row) => Number((row as { unpaidLeaveDays?: number }).unpaidLeaveDays || 0) > 0 || Number(row.deductionAmount || 0) > 0 || Number(row.loanDeductionAmount || 0) > 0 || Number(row.baseSalary || 0) <= 0).length;
    return { runs: payrollRuns.length, selectedRunStatus: text(run?.status), employeesInRun: countText(run?.itemCount || runItems.length), totalBase: money(run?.totalBaseSalary), totalDeduction: money(run?.totalDeductionAmount), totalLoan: money(run?.totalLoanDeductionAmount), totalNet: money(run?.totalNetPay || summary?.payroll?.totalNetPay), needsReview: countText(needsReview) };
  }, [month, payrollRuns, summary?.payroll?.totalNetPay]);

  const alerts = useMemo(() => {
    const rows: Array<{ id: string; type: string; target: string; note: string; action: string; to: string }> = [];
    filteredEmployees.filter(isMissingEmployeeBasics).slice(0, 20).forEach((employee) => rows.push({ id: `employee-${employee.id}`, type: 'ملف موظف', target: employeeName(employee), note: 'بيانات أساسية أو وظيفية ناقصة.', action: 'فتح الملف', to: `/hr/employees/${employee.id}` }));
    leaves.filter(leaveNeedsReview).slice(0, 10).forEach((request) => rows.push({ id: `leave-${request.id}`, type: 'إجازات', target: text(request.employeeName), note: 'طلب إجازة قيد المراجعة.', action: 'فتح الإجازات', to: '/hr/leaves' }));
    loans.filter(hasDueLoan).slice(0, 10).forEach((loan) => rows.push({ id: `loan-${loan.id}`, type: 'سلف', target: text(loan.employeeName || loan.loanNo), note: `قسط مستحق هذا الشهر بقيمة ${money(loan.dueInstallmentsAmount || 0)}.`, action: 'فتح السلف', to: '/hr/loans' }));
    assets.filter(needsAssetReview).slice(0, 10).forEach((asset) => rows.push({ id: `asset-${asset.id}`, type: 'عُهد', target: text(asset.employeeName || asset.assetName), note: 'عهدة تالفة أو مفقودة أو ناقصة بيانات.', action: 'فتح العُهد', to: '/hr/assets' }));
    payrollRuns.filter(payrollRunNeedsReview).slice(0, 10).forEach((run) => rows.push({ id: `payroll-${run.id}`, type: 'مرتبات', target: text(run.periodMonth), note: 'مسير يحتاج مراجعة قبل الاعتماد النهائي.', action: 'فتح المرتبات', to: '/hr/payroll' }));
    const unmarked = Number(attendanceQuery.data?.summary?.unmarkedCount || 0);
    if (unmarked > 0) rows.push({ id: 'attendance-unmarked', type: 'حضور', target: 'سجلات الحضور', note: `يوجد ${unmarked} سجل حضور غير مكتمل ويحتاج مراجعة.`, action: 'فتح الحضور', to: '/hr/attendance' });
    return rows.slice(0, 80);
  }, [assets, attendanceQuery.data?.summary?.unmarkedCount, filteredEmployees, leaves, loans, payrollRuns]);

  const hasAnyData = filteredEmployees.length > 0 || loans.length > 0 || leaves.length > 0 || assets.length > 0 || payrollRuns.length > 0 || Number(summary?.employeeCount || 0) > 0;
  const loading = summaryQuery.isLoading || workspace.employees.isLoading || attendanceQuery.isLoading || leavesQuery.isLoading || assetsQuery.isLoading;
  const isError = summaryQuery.isError || workspace.employees.isError || attendanceQuery.isError || leavesQuery.isError || assetsQuery.isError;
  const error = summaryQuery.error || workspace.employees.error || attendanceQuery.error || leavesQuery.error || assetsQuery.error;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="تقارير الموارد البشرية"
          description="ملخص تشغيلي سريع لكل دورة HR: الموظفين، الحضور، الإجازات، السلف، المرتبات، والعُهد."
          actions={
            <div className="actions compact-actions">
              <Button variant="secondary" onClick={() => navigate('/hr')}>نظرة عامة HR</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Compact Single-Row KPI Summary Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>لوحة المؤشرات المختصرة للموارد البشرية</span>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر لتصفية نوع التقرير فوراً</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { label: 'إجمالي الموظفين', value: employeesReport.total, onClick: () => setReportType('employees'), isAlert: false, active: reportType === 'employees' },
                { label: 'ملفات ناقصة', value: employeesReport.missingBasics, onClick: () => setReportType('employees'), isAlert: employeesReport.missingBasics > 0, active: reportType === 'employees' },
                { label: 'سجلات الحضور', value: attendanceReport.total, onClick: () => setReportType('attendance'), isAlert: false, active: reportType === 'attendance' },
                { label: 'طلبات الإجازة', value: leavesReport.total, onClick: () => setReportType('leaves'), isAlert: false, active: reportType === 'leaves' },
                { label: 'سلف مفتوحة', value: loansReport.open, onClick: () => setReportType('loans'), isAlert: false, active: reportType === 'loans' },
                { label: 'صافي المرتبات', value: payrollReport.totalNet, onClick: () => setReportType('payroll'), isAlert: false, active: reportType === 'payroll' },
                { label: 'عُهد للمراجعة', value: assetsReport.needsReview, onClick: () => setReportType('assets'), isAlert: assetsReport.needsReview > 0, active: reportType === 'assets' },
                { label: 'تنبيهات', value: alerts.length, onClick: () => setReportType('alerts'), isAlert: alerts.length > 0, active: reportType === 'alerts' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  onClick={stat.onClick}
                  style={{
                    background: stat.active ? '#eff6ff' : '#ffffff',
                    border: `1px solid ${stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    minWidth: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0')}
                >
                  <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                    {stat.label}
                  </span>
                  <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.active ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
                    {stat.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Integrated Filters Toolbar - Single Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              style={{ width: '190px', minWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>من:</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>إلى:</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>الشهر:</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }} />
            </div>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              style={{ width: 'auto', minWidth: '120px', maxWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
            >
              <option value="all">كل الأقسام</option>
              {departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
              style={{ width: 'auto', minWidth: '120px', maxWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
            >
              {reportTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <QueryFeedback isLoading={loading} isError={isError} error={error} isEmpty={!hasAnyData} loadingText="جارٍ تحميل التقارير..." errorTitle="تعذر تحميل تقارير الموارد البشرية" emptyTitle="لا توجد بيانات كافية لعرض التقرير.">
            {reportType === 'all' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 2-Column High-Density Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                  {/* Employees Summary Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <UsersIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
                        <span>تقرير الموظفين</span>
                      </strong>
                      <Button variant="secondary" onClick={() => setReportType('employees')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض التفاصيل</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الإجمالي</span><strong style={{ fontSize: '0.95rem' }}>{employeesReport.total}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نشط</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{employeesReport.active}</strong></div>
                      <div style={{ background: '#fff', border: `1px solid ${employeesReport.missingBasics > 0 ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>ملفات ناقصة</span><strong style={{ fontSize: '0.95rem', color: employeesReport.missingBasics > 0 ? '#dc2626' : '#0f172a' }}>{employeesReport.missingBasics}</strong></div>
                    </div>
                  </div>

                  {/* Attendance Summary Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ClockIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
                        <span>تقرير الحضور</span>
                      </strong>
                      <Button variant="secondary" onClick={() => setReportType('attendance')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض التفاصيل</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>سجلات الفترة</span><strong style={{ fontSize: '0.95rem' }}>{attendanceReport.total}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>حاضر</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{attendanceReport.present}</strong></div>
                      <div style={{ background: '#fff', border: `1px solid ${attendanceReport.absent !== '0' ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>غياب / استثناء</span><strong style={{ fontSize: '0.95rem', color: attendanceReport.absent !== '0' ? '#dc2626' : '#0f172a' }}>{attendanceReport.absent}</strong></div>
                    </div>
                  </div>

                  {/* Leaves Summary Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
                        <span>تقرير الإجازات</span>
                      </strong>
                      <Button variant="secondary" onClick={() => setReportType('leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض التفاصيل</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الطلبات</span><strong style={{ fontSize: '0.95rem' }}>{leavesReport.total}</strong></div>
                      <div style={{ background: '#fff', border: `1px solid ${leavesReport.pending !== '0' ? '#fde047' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>قيد المراجعة</span><strong style={{ fontSize: '0.95rem', color: leavesReport.pending !== '0' ? '#ca8a04' : '#0f172a' }}>{leavesReport.pending}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>معتمدة</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{leavesReport.approved}</strong></div>
                    </div>
                  </div>

                  {/* Loans Summary Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <WalletIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
                        <span>تقرير السلف والخصومات</span>
                      </strong>
                      <Button variant="secondary" onClick={() => setReportType('loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض التفاصيل</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>سلف مفتوحة</span><strong style={{ fontSize: '0.95rem' }}>{loansReport.open}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>مستحق الشهر</span><strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{money(loansReport.dueAmount)}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المتبقي</span><strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>{money(loansReport.remainingAmount)}</strong></div>
                    </div>
                  </div>

                  {/* Payroll Summary Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <BanknotesIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
                        <span>تقرير المرتبات</span>
                      </strong>
                      <Button variant="secondary" onClick={() => setReportType('payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض التفاصيل</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المسيرات</span><strong style={{ fontSize: '0.95rem' }}>{payrollReport.runs}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>صافي المرتبات</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{payrollReport.totalNet}</strong></div>
                      <div style={{ background: '#fff', border: `1px solid ${payrollReport.needsReview !== '0' ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>يحتاج مراجعة</span><strong style={{ fontSize: '0.95rem', color: payrollReport.needsReview !== '0' ? '#dc2626' : '#0f172a' }}>{payrollReport.needsReview}</strong></div>
                    </div>
                  </div>

                  {/* Assets Summary Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <BriefcaseIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
                        <span>تقرير العُهد</span>
                      </strong>
                      <Button variant="secondary" onClick={() => setReportType('assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض التفاصيل</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الإجمالي</span><strong style={{ fontSize: '0.95rem' }}>{assetsReport.total}</strong></div>
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>مسلّمة</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{assetsReport.assigned}</strong></div>
                      <div style={{ background: '#fff', border: `1px solid ${assetsReport.needsReview > 0 ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>تالف / مفقود</span><strong style={{ fontSize: '0.95rem', color: assetsReport.needsReview > 0 ? '#dc2626' : '#0f172a' }}>{assetsReport.needsReview}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Alerts Section */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangleIcon size={16} style={{ color: '#ea580c' }} />
                      <span>تنبيهات تحتاج مراجعة</span>
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{alerts.length} تنبيه</span>
                  </div>
                  {alerts.length ? (
                    <DataTable
                      density="compact"
                      rows={alerts}
                      rowKey={(row) => row.id}
                      onRowClick={(row) => navigate(row.to)}
                      columns={[
                        { key: 'type', header: 'النوع', cell: (row) => row.type },
                        { key: 'target', header: 'الموظف/الفترة', cell: (row) => row.target },
                        { key: 'note', header: 'التنبيه', cell: (row) => row.note },
                        { key: 'action', header: 'الإجراء', cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{row.action}</Button> },
                      ]}
                    />
                  ) : (
                    <p className="muted" style={{ margin: 0, fontSize: '0.825rem' }}>لا توجد تنبيهات عاجلة، كافة العمليات تسير بشكل سليم.</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="secondary" onClick={() => setReportType('all')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>&rarr; رجوع لجميع التقارير</Button>
                </div>

                {reportType === 'employees' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير الموظفين التفصيلي</strong>
                      <Button variant="secondary" onClick={() => navigate('/hr/employees')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح صفحة الموظفين</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px', marginBottom: 12 }}>
                      {[
                        { label: 'إجمالي النتائج', value: employeesReport.total },
                        { label: 'نشط', value: employeesReport.active },
                        { label: 'غير نشط', value: employeesReport.inactive },
                        { label: 'بدون رقم قومي', value: employeesReport.missingNationalId, isAlert: employeesReport.missingNationalId > 0 },
                        { label: 'بدون قسم/مسمى', value: employeesReport.missingDepartmentOrTitle, isAlert: employeesReport.missingDepartmentOrTitle > 0 },
                        { label: 'دوام ناقص', value: employeesReport.missingWorkSchedule, isAlert: employeesReport.missingWorkSchedule > 0 },
                      ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                          <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                    <DataTable density="compact" rowKey={(row) => String(row.id)} rows={filteredEmployees.slice(0, 40)} onRowClick={(row) => navigate(`/hr/employees/${row.id}`)} columns={[{ key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) }, { key: 'name', header: 'اسم الموظف', cell: employeeName }, { key: 'department', header: 'القسم', cell: (row) => text(row.departmentName) }, { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => text(row.jobTitleName) }, { key: 'nationalId', header: 'الرقم القومي', cell: (row) => normalize(row.nationalId) ? 'موجود' : 'غير مسجل' }, { key: 'status', header: 'الحالة', cell: (row) => isActiveEmployee(row) ? 'نشط' : 'غير نشط' }]} />
                  </div>
                )}

                {reportType === 'attendance' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير الحضور التفصيلي</strong>
                      <Button variant="secondary" onClick={() => navigate('/hr/attendance')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح الحضور</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                      {[
                        { label: 'إجمالي سجلات الفترة', value: attendanceReport.total },
                        { label: 'حاضر', value: attendanceReport.present },
                        { label: 'غائب', value: attendanceReport.absent, isAlert: attendanceReport.absent !== '0' },
                        { label: 'متأخر', value: attendanceReport.late },
                        { label: 'غير مسجل / يحتاج مراجعة', value: attendanceReport.needsReview, isAlert: attendanceReport.needsReview !== '0' },
                      ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                          <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportType === 'leaves' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير الإجازات التفصيلي</strong>
                      <Button variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح الإجازات</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                      {[
                        { label: 'إجمالي الطلبات', value: leavesReport.total },
                        { label: 'قيد المراجعة', value: leavesReport.pending, isAlert: leavesReport.pending !== '0' },
                        { label: 'معتمدة', value: leavesReport.approved },
                        { label: 'مرفوضة', value: leavesReport.rejected },
                        { label: 'غير مدفوعة / أيام', value: leavesReport.unpaid },
                      ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                          <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportType === 'loans' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير السلف والخصومات</strong>
                      <Button variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح السلف</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                      {[
                        { label: 'إجمالي السلف', value: loansReport.total },
                        { label: 'سلف مفتوحة', value: loansReport.open },
                        { label: 'أقساط مستحقة', value: loansReport.dueCount, isAlert: loansReport.dueCount > 0 },
                        { label: 'مستحق هذا الشهر', value: money(loansReport.dueAmount) },
                        { label: 'إجمالي المتبقي', value: money(loansReport.remainingAmount) },
                      ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                          <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportType === 'payroll' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير المرتبات</strong>
                      <Button variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح المرتبات</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
                      {[
                        { label: 'عدد المسيرات', value: payrollReport.runs },
                        { label: 'حالة المسير', value: payrollReport.selectedRunStatus },
                        { label: 'الموظفون', value: payrollReport.employeesInRun },
                        { label: 'إجمالي الأساسي', value: payrollReport.totalBase },
                        { label: 'إجمالي الخصومات', value: payrollReport.totalDeduction },
                        { label: 'السلف / الأقساط', value: payrollReport.totalLoan },
                        { label: 'صافي المرتبات', value: payrollReport.totalNet },
                        { label: 'يحتاج مراجعة', value: payrollReport.needsReview, isAlert: payrollReport.needsReview !== '0' },
                      ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                          <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportType === 'assets' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير العُهد</strong>
                      <Button variant="secondary" onClick={() => navigate('/hr/assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح العُهد</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                      {[
                        { label: 'إجمالي العُهد', value: assetsReport.total },
                        { label: 'مسلّمة', value: assetsReport.assigned },
                        { label: 'مرتجعة', value: assetsReport.returned },
                        { label: 'تالفة', value: assetsReport.damaged, isAlert: assetsReport.damaged > 0 },
                        { label: 'مفقودة', value: assetsReport.lost, isAlert: assetsReport.lost > 0 },
                        { label: 'مفتوحة', value: assetsReport.open },
                        { label: 'تحتاج مراجعة', value: assetsReport.needsReview, isAlert: assetsReport.needsReview > 0 },
                      ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                          <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportType === 'alerts' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', marginBottom: '8px' }}>تنبيهات تحتاج مراجعة</strong>
                    {alerts.length ? (
                      <DataTable
                        density="compact"
                        rows={alerts}
                        rowKey={(row) => row.id}
                        onRowClick={(row) => navigate(row.to)}
                        columns={[
                          { key: 'type', header: 'النوع', cell: (row) => row.type },
                          { key: 'target', header: 'الموظف/الفترة', cell: (row) => row.target },
                          { key: 'note', header: 'التنبيه', cell: (row) => row.note },
                          { key: 'action', header: 'الإجراء', cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{row.action}</Button> },
                        ]}
                      />
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>لا توجد تنبيهات ظاهرة حسب الفلاتر الحالية.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </QueryFeedback>
        </div>
      </main>
    </div>
  );
}
