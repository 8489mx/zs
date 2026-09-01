import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { HrAttendanceException, HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan, HrPayrollRun } from '@/types/domain';
import {
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  WalletIcon,
  BriefcaseIcon,
  BanknotesIcon,
  FileTextIcon,
  ChartBarIcon,
  CogIcon,
} from '@/features/hr/components/HrIcons';
import {
  useHrAttendance,
  useHrAttendanceExceptions,
  useHrEmployeeAssets,
  useHrLeaveRequests,
  useHrReportsSummary,
  useHrWorkspace,
} from '@/features/hr/hooks/useHr';

type ReviewItem = {
  id: string;
  priority: 'عاجل' | 'مراجعة' | 'متابعة';
  type: string;
  description: string;
  to: string;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toFixed(2);
}

function employeeName(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || 'غير متاح';
}

function needsAssetReview(status: unknown) {
  const value = text(status).toLowerCase();
  return value === 'lost' || value === 'damaged';
}

function payrollNeedsReview(status: unknown) {
  const value = text(status).toLowerCase();
  return value === 'draft' || value === 'reviewed';
}

function attendanceNeedsReview(status: unknown) {
  const value = text(status).toLowerCase();
  return value === 'pending' || value === 'needs_review';
}

export function HrComingSoonPage() {
  const navigate = useNavigate();
  const today = todayDate();
  const month = today.slice(0, 7);
  const canViewEmployees = useHasAnyPermission(['hrEmployees']);
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canViewPayroll = useHasAnyPermission(['hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);

  const workspace = useHrWorkspace({ page: 1, pageSize: 200, month });
  const reports = useHrReportsSummary({ from: monthStartDate(today), to: today, month });
  const attendance = useHrAttendance({ date: today, page: 1, pageSize: 300 });
  const attendanceExceptions = useHrAttendanceExceptions({ date: today, page: 1, pageSize: 200 });
  const leaves = useHrLeaveRequests({ page: 1, pageSize: 200, status: 'pending', enabled: canViewEmployees });
  const assets = useHrEmployeeAssets({ page: 1, pageSize: 300, enabled: canViewEmployees });

  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const loans = useMemo(() => (workspace.loans.data?.loans || []) as HrLoan[], [workspace.loans.data?.loans]);
  const payrollRuns = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const pendingLeaves = useMemo(() => (leaves.data?.requests || []) as HrLeaveRequest[], [leaves.data?.requests]);
  const assetRows = useMemo(() => (assets.data?.assets || []) as HrEmployeeAsset[], [assets.data?.assets]);
  const exceptionRows = useMemo(() => ((attendanceExceptions.data?.rows || []) as HrAttendanceException[]).filter((row) => attendanceNeedsReview(row.status)), [attendanceExceptions.data?.rows]);

  const reportSummary = reports.data?.summary;
  const activeEmployees = Number(workspace.employees.data?.summary?.activeCount ?? reportSummary?.activeEmployeeCount ?? 0);
  const totalEmployees = Number(workspace.employees.data?.summary?.totalItems ?? reportSummary?.employeeCount ?? employees.length);
  const presentToday = Number(attendance.data?.summary?.presentCount ?? 0);
  const assetsNeedReview = assetRows.filter((row) => needsAssetReview(row.status)).length;
  const dueLoanAmount = canViewLoans ? loans.reduce((sum, row) => sum + Number(row.dueInstallmentsAmount || 0), 0) : 0;
  const payrollReviewCount = canViewPayroll ? payrollRuns.filter((row) => payrollNeedsReview(row.status)).length : 0;

  const incompleteEmployees = employees.filter((employee) => {
    return !text(employee.employeeNo) || !text(employee.nationalId) || !text(employee.departmentName) || !text(employee.jobTitleName);
  });

  const reviewItems = useMemo<ReviewItem[]>(() => {
    const items: ReviewItem[] = [];

    exceptionRows.slice(0, 4).forEach((row) => {
      items.push({
        id: `attendance-${row.id}`,
        priority: 'عاجل',
        type: 'استثناء حضور',
        description: `${text(row.employeeName) || 'موظف'} لديه استثناء حضور يحتاج اعتماد أو تخطي.`,
        to: '/hr/attendance',
      });
    });

    pendingLeaves.slice(0, 4).forEach((row) => {
      items.push({
        id: `leave-${row.id}`,
        priority: 'مراجعة',
        type: 'طلب إجازة',
        description: `${text(row.employeeName) || 'موظف'} لديه طلب إجازة قيد المراجعة.`,
        to: '/hr/leaves',
      });
    });

    assetRows.filter((row) => needsAssetReview(row.status)).slice(0, 4).forEach((row) => {
      items.push({
        id: `asset-${row.id}`,
        priority: 'مراجعة',
        type: 'عهدة',
        description: `${text(row.assetName) || 'عهدة'} مسجلة تالفة أو مفقودة وتحتاج مراجعة.`,
        to: '/hr/assets',
      });
    });

    incompleteEmployees.slice(0, 4).forEach((row) => {
      items.push({
        id: `employee-${row.id}`,
        priority: 'متابعة',
        type: 'ملف موظف',
        description: `${employeeName(row)} يحتاج استكمال بيانات أساسية أو وظيفية.`,
        to: `/hr/employees/${row.id}`,
      });
    });

    return items.slice(0, 10);
  }, [assetRows, exceptionRows, incompleteEmployees, pendingLeaves]);

  const loading = (canViewEmployees && workspace.employees.isLoading) || attendance.isLoading;
  const isError = (canViewEmployees && workspace.employees.isError) || attendance.isError;
  const error = (canViewEmployees ? workspace.employees.error : null) || attendance.error;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="الموارد البشرية"
          description="نظرة تشغيلية مختصرة: ابدأ من العناصر التي تحتاج إجراء، أو انتقل مباشرة للقسم المطلوب."
          actions={
            <div className="actions compact-actions">
              {canViewEmployees && <Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>}
              {useHasAnyPermission('hrAttendance') && <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>}
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <QueryFeedback
            isLoading={loading}
            isError={isError}
            error={error}
            isEmpty={false}
            loadingText="جاري تحميل نظرة الموارد البشرية..."
            errorTitle="تعذر تحميل نظرة الموارد البشرية"
          >
            {/* Compact Single-Row KPI Summary Bar */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص تشغيلي سريع</span>
                <span style={{ fontSize: '0.725rem', color: '#64748b' }}>مؤشرات اليوم لجميع أقسام الموارد البشرية</span>
              </div>
              
              <div className="hr-operational-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
                {[
                  { label: 'إجمالي الموظفين', value: totalEmployees, to: '/hr/employees', isAlert: false },
                  { label: 'نشط', value: activeEmployees, to: '/hr/employees', isAlert: false },
                  { label: 'حاضر اليوم', value: presentToday, to: '/hr/attendance', isAlert: false },
                  { label: 'طلبات إجازة', value: pendingLeaves.length, to: '/hr/leaves', isAlert: pendingLeaves.length > 0 },
                  { label: 'استثناءات حضور', value: exceptionRows.length, to: '/hr/attendance', isAlert: exceptionRows.length > 0 },
                  { label: 'عُهد للمراجعة', value: assetsNeedReview, to: '/hr/assets', isAlert: assetsNeedReview > 0 },
                  { label: 'أقساط مستحقة', value: money(dueLoanAmount), to: '/hr/loans', isAlert: false },
                  { label: 'مرتبات للمراجعة', value: payrollReviewCount, to: '/hr/payroll', isAlert: payrollReviewCount > 0 },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(stat.to)}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
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
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.isAlert ? '#fca5a5' : '#e2e8f0')}
                  >
                    <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                      {stat.label}
                    </span>
                    <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
                      {stat.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Shortcuts Row (3x3 Grid on Mobile) */}
            <div className="hr-quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'إضافة موظف', icon: <UsersIcon size={14} />, to: '/hr/employees/new', variant: 'primary' as const },
                { label: 'تسجيل الحضور', icon: <ClockIcon size={14} />, to: '/hr/attendance', variant: 'secondary' as const },
                { label: 'طلب إجازة', icon: <CalendarIcon size={14} />, to: '/hr/leaves', variant: 'secondary' as const },
                { label: 'سلفة جديدة', icon: <WalletIcon size={14} />, to: '/hr/loans', variant: 'secondary' as const },
                { label: 'تسليم عهدة', icon: <BriefcaseIcon size={14} />, to: '/hr/assets', variant: 'secondary' as const },
                { label: 'مسير المرتبات', icon: <BanknotesIcon size={14} />, to: '/hr/payroll', variant: 'secondary' as const },
                { label: 'المستندات', icon: <FileTextIcon size={14} />, to: '/hr/documents', variant: 'secondary' as const },
                { label: 'التقارير', icon: <ChartBarIcon size={14} />, to: '/hr/reports', variant: 'secondary' as const },
                { label: 'الإعدادات', icon: <CogIcon size={14} />, to: '/hr/settings', variant: 'secondary' as const },
              ].map((act, i) => (
                <Button
                  key={i}
                  type="button"
                  variant={act.variant}
                  onClick={() => navigate(act.to)}
                  className="hr-quick-action-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 8px', fontSize: '0.76rem', borderRadius: '6px', width: '100%' }}
                >
                  {act.icon}
                  <span>{act.label}</span>
                </Button>
              ))}
            </div>

            {/* Tasks that need immediate action */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>مهام تحتاج إجراء ومتابعة</span>
                <span style={{ fontSize: '0.725rem', color: '#64748b' }}>أهم العناصر التي تستحق المتابعة الفورية</span>
              </div>
              
              <DataTable
                rows={reviewItems}
                rowKey={(row) => row.id}
                density="compact"
                onRowClick={(row) => navigate(row.to)}
                columns={[
                  {
                    key: 'priority',
                    header: 'الأولوية',
                    className: 'col-fit',
                    cell: (row) => (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: row.priority === 'عاجل' ? '#fee2e2' : row.priority === 'مراجعة' ? '#fef3c7' : '#e0f2fe',
                          color: row.priority === 'عاجل' ? '#b91c1c' : row.priority === 'مراجعة' ? '#b45309' : '#0369a1',
                        }}
                      >
                        {row.priority}
                      </span>
                    ),
                  },
                  { key: 'type', header: 'النوع', className: 'col-fit', cell: (row) => <strong>{row.type}</strong> },
                  { key: 'description', header: 'الوصف', cell: (row) => row.description },
                  {
                    key: 'action',
                    header: 'الإجراء',
                    className: 'col-fit',
                    cell: (row) => (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={(event) => { event.stopPropagation(); navigate(row.to); }}
                        style={{ padding: '2px 10px', fontSize: '0.775rem' }}
                      >
                        فتح
                      </Button>
                    ),
                  },
                ]}
              />
              {!reviewItems.length ? <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.825rem' }}>لا توجد عناصر عاجلة ظاهرة حاليًا، كل الأمور تحت السيطرة.</p> : null}
            </div>
          </QueryFeedback>
        </div>
      </main>
    </div>
  );
}
