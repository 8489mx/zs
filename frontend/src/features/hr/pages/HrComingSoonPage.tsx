import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { DataTable } from '@/shared/ui/data-table';
import type {
  HrAttendanceException,
  HrEmployee,
  HrEmployeeAsset,
  HrLeaveRequest,
  HrLeaveType,
  HrLoan,
  HrPayrollRun,
} from '@/types/domain';
import {
  useHrAttendance,
  useHrAttendanceExceptions,
  useHrEmployeeAssets,
  useHrLeaveRequests,
  useHrLeaveTypes,
  useHrReportsSummary,
  useHrWorkspace,
} from '@/features/hr/hooks/useHr';

type ReviewItem = {
  id: string;
  type: string;
  employee: string;
  description: string;
  actionLabel: string;
  to: string;
};

type SetupState = 'مكتمل' | 'يحتاج استكمال' | 'غير متاح';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate(dateValue: string) {
  return `${dateValue.slice(0, 7)}-01`;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function employeeDisplayName(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || 'غير متاح';
}

function leaveStatusLabel(value: unknown) {
  const status = text(value).toLowerCase();
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'approved') return 'معتمدة';
  if (status === 'rejected') return 'مرفوضة';
  if (status === 'cancelled' || status === 'canceled') return 'ملغاة';
  return 'غير متاح';
}

function assetStatusLabel(value: unknown) {
  const status = text(value).toLowerCase();
  if (status === 'assigned') return 'مسلّمة';
  if (status === 'returned') return 'مرتجعة';
  if (status === 'lost') return 'مفقودة';
  if (status === 'damaged') return 'تالفة';
  if (status === 'cancelled' || status === 'canceled') return 'ملغاة';
  return 'غير متاح';
}

function assetStatusNeedsReview(value: unknown) {
  const status = text(value).toLowerCase();
  return status === 'lost' || status === 'damaged';
}

function payrollNeedsReview(value: unknown) {
  const status = text(value).toLowerCase();
  return status === 'draft' || status === 'reviewed';
}

function setupStateFromCount(count: number | null | undefined): SetupState {
  if (count == null) return 'غير متاح';
  return count > 0 ? 'مكتمل' : 'يحتاج استكمال';
}

export function HrComingSoonPage() {
  const navigate = useNavigate();
  const canViewEmployees = useHasAnyPermission('hrEmployees');
  const canViewAttendance = useHasAnyPermission('hrEmployees');
  const canViewLeaves = useHasAnyPermission('hrEmployees');
  const canViewAssets = useHasAnyPermission('hrEmployees');
  const canViewDocuments = useHasAnyPermission('hrEmployees');
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canViewPayroll = useHasAnyPermission(['hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);
  const canViewReports = useHasAnyPermission('hr');
  const canManageSettings = useHasAnyPermission('hr');
  const today = todayDate();
  const month = today.slice(0, 7);

  const workspace = useHrWorkspace({ page: 1, pageSize: 200, month });
  const reportsQuery = useHrReportsSummary({ from: monthStartDate(today), to: today, month });
  const attendanceQuery = useHrAttendance({ date: today, page: 1, pageSize: 400 });
  const attendanceExceptionsQuery = useHrAttendanceExceptions({ date: today, page: 1, pageSize: 200 });
  const leaveRequestsQuery = useHrLeaveRequests({ page: 1, pageSize: 200, status: 'pending' });
  const assetsQuery = useHrEmployeeAssets({ page: 1, pageSize: 300 });
  const leaveTypesQuery = useHrLeaveTypes({ page: 1, pageSize: 200 });

  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const loans = useMemo(() => (workspace.loans.data?.loans || []) as HrLoan[], [workspace.loans.data?.loans]);
  const payrollRuns = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const leaveRequests = useMemo(() => (leaveRequestsQuery.data?.requests || []) as HrLeaveRequest[], [leaveRequestsQuery.data?.requests]);
  const assets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);
  const attendanceExceptions = useMemo(
    () => ((attendanceExceptionsQuery.data?.rows || []) as HrAttendanceException[]).filter((row) => {
      const status = text(row.status).toLowerCase();
      return status === 'pending' || status === 'needs_review';
    }),
    [attendanceExceptionsQuery.data?.rows],
  );
  const leaveTypes = useMemo(() => (leaveTypesQuery.data?.rows || []) as HrLeaveType[], [leaveTypesQuery.data?.rows]);

  const loading = workspace.summary.isLoading || workspace.employees.isLoading || attendanceQuery.isLoading;
  const isError = workspace.summary.isError || workspace.employees.isError || attendanceQuery.isError;
  const error = workspace.summary.error || workspace.employees.error || attendanceQuery.error;

  const reportSummary = reportsQuery.data?.summary;
  const attendanceSummary = attendanceQuery.data?.summary;

  const activeEmployees = Number(workspace.employees.data?.summary?.activeCount ?? reportSummary?.activeEmployeeCount ?? 0);
  const totalEmployees = Number(workspace.employees.data?.summary?.totalItems ?? reportSummary?.employeeCount ?? 0);
  const attendanceToday = Number(attendanceSummary?.presentCount ?? 0);
  const pendingLeaves = Number(leaveRequestsQuery.data?.summary?.pendingCount ?? 0);
  const nearExpiryDocuments = 'غير متاح';
  const assetsNeedReview = assets.filter((item) => assetStatusNeedsReview(item.status)).length;
  const dueLoanInstallments = canViewLoans
    ? Number(loans.reduce((sum, loan) => sum + Number(loan.dueInstallmentsAmount || 0), 0).toFixed(2))
    : Number.NaN;
  const payrollNeedsReviewCount = canViewPayroll ? payrollRuns.filter((run) => payrollNeedsReview(run.status)).length : Number.NaN;

  const incompleteEmployees = employees.filter((employee) => {
    const hasNationalId = text(employee.nationalId);
    const hasEmployeeNo = text(employee.employeeNo);
    const hasDepartment = text(employee.departmentName);
    const hasJobTitle = text(employee.jobTitleName);
    return !hasEmployeeNo || !hasNationalId || !hasDepartment || !hasJobTitle;
  });

  const reviewItems = useMemo<ReviewItem[]>(() => {
    const items: ReviewItem[] = [];

    incompleteEmployees.slice(0, 8).forEach((employee) => {
      items.push({
        id: `employee-${employee.id}`,
        type: 'ملف موظف',
        employee: `${employeeDisplayName(employee)} (${text(employee.employeeNo) || 'بدون كود'})`,
        description: 'بيانات الموظف الأساسية تحتاج استكمال.',
        actionLabel: 'فتح الموظفين',
        to: '/hr/employees',
      });
    });

    leaveRequests.slice(0, 8).forEach((request) => {
      items.push({
        id: `leave-${request.id}`,
        type: 'طلب إجازة',
        employee: `${text(request.employeeName) || 'غير متاح'} (${text(request.employeeNo) || 'بدون كود'})`,
        description: `طلب ${text(request.leaveTypeName || request.leaveType) || 'إجازة'} حالته ${leaveStatusLabel(request.status)}.`,
        actionLabel: 'فتح الإجازات',
        to: '/hr/leaves',
      });
    });

    assets
      .filter((asset) => assetStatusNeedsReview(asset.status))
      .slice(0, 8)
      .forEach((asset) => {
        items.push({
          id: `asset-${asset.id}`,
          type: 'عهدة',
          employee: `${text(asset.employeeName) || 'غير متاح'} (${text(asset.employeeNo) || 'بدون كود'})`,
          description: `العهدة ${text(asset.assetName) || 'غير متاح'} حالتها ${assetStatusLabel(asset.status)}.`,
          actionLabel: 'فتح العهد',
          to: '/hr/assets',
        });
      });

    attendanceExceptions.slice(0, 8).forEach((exception) => {
      items.push({
        id: `attendance-ex-${exception.id}`,
        type: 'استثناء حضور',
        employee: `${text(exception.employeeName) || 'غير متاح'} (${text(exception.employeeNo) || 'بدون كود'})`,
        description: `استثناء ${text(exception.exceptionType) || 'حضور'} بتاريخ ${text(exception.workDate) || today} يحتاج مراجعة.`,
        actionLabel: 'فتح الحضور',
        to: '/hr/attendance',
      });
    });

    if (canViewLoans) {
      loans
      .filter((loan) => Number(loan.dueInstallmentsAmount || 0) > 0)
      .slice(0, 8)
      .forEach((loan) => {
        items.push({
          id: `loan-${loan.id}`,
          type: 'قسط سلفة',
          employee: `${text(loan.employeeName) || 'غير متاح'} (${text(loan.loanNo) || 'بدون رقم'})`,
          description: `قسط مستحق هذا الشهر بقيمة ${Number(loan.dueInstallmentsAmount || 0).toFixed(2)}.`,
          actionLabel: 'فتح السلف',
          to: '/hr/loans',
        });
      });
    }

    if (canViewPayroll) {
      payrollRuns
      .filter((run) => payrollNeedsReview(run.status))
      .slice(0, 8)
      .forEach((run) => {
        items.push({
          id: `payroll-${run.id}`,
          type: 'مسير مرتبات',
          employee: '—',
          description: `مسير ${text(run.periodMonth) || month} حالته ${text(run.status) || 'غير متاح'} ويحتاج مراجعة.`,
          actionLabel: 'فتح المرتبات',
          to: '/hr/payroll',
        });
      });
    }

    return items.slice(0, 20);
  }, [assets, attendanceExceptions, canViewLoans, canViewPayroll, incompleteEmployees, leaveRequests, loans, payrollRuns, month, today]);

  const setupRows = [
    {
      label: 'الأقسام',
      value: Number(workspace.departments.data?.summary?.totalItems ?? workspace.departments.data?.rows?.length ?? 0),
      state: setupStateFromCount(workspace.departments.data?.summary?.totalItems ?? workspace.departments.data?.rows?.length),
    },
    {
      label: 'المسميات الوظيفية',
      value: Number(workspace.jobTitles.data?.summary?.totalItems ?? workspace.jobTitles.data?.rows?.length ?? 0),
      state: setupStateFromCount(workspace.jobTitles.data?.summary?.totalItems ?? workspace.jobTitles.data?.rows?.length),
    },
    {
      label: 'أنواع الإجازات',
      value: Number(leaveTypes.length || 0),
      state: setupStateFromCount(leaveTypes.length),
    },
    {
      label: 'موظفون ناقصو بيانات أساسية',
      value: incompleteEmployees.length,
      state: incompleteEmployees.length > 0 ? 'يحتاج استكمال' : 'مكتمل',
    },
    {
      label: 'أنواع المستندات',
      value: 'غير متاح',
      state: 'غير متاح',
    },
  ];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="نظرة عامة على الموارد البشرية"
        description="ملخص تشغيلي لحالة الموارد البشرية والعناصر التي تحتاج مراجعة لتسهيل المتابعة اليومية واتخاذ الإجراء المناسب."
      />

      <QueryFeedback
        isLoading={loading}
        isError={isError}
        error={error}
        isEmpty={false}
        loadingText="جاري تحميل نظرة الموارد البشرية..."
        errorTitle="تعذر تحميل نظرة الموارد البشرية"
      >
        <div className="stats-grid">
          <Card title="إجمالي الموظفين"><strong>{Number.isFinite(totalEmployees) ? totalEmployees : 'غير متاح'}</strong></Card>
          <Card title="الموظفون النشطون"><strong>{Number.isFinite(activeEmployees) ? activeEmployees : 'غير متاح'}</strong></Card>
          <Card title="حضور اليوم"><strong>{Number.isFinite(attendanceToday) ? attendanceToday : 'غير متاح'}</strong></Card>
          <Card title="إجازات قيد المراجعة"><strong>{Number.isFinite(pendingLeaves) ? pendingLeaves : 'غير متاح'}</strong></Card>
          <Card title="مستندات قريبة الانتهاء"><strong>{nearExpiryDocuments}</strong></Card>
          <Card title="عُهد تحتاج مراجعة"><strong>{Number.isFinite(assetsNeedReview) ? assetsNeedReview : 'غير متاح'}</strong></Card>
          <Card title="أقساط سلف مستحقة هذا الشهر"><strong>{canViewLoans && Number.isFinite(dueLoanInstallments) ? dueLoanInstallments.toFixed(2) : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
          <Card title="مرتبات تحتاج مراجعة"><strong>{canViewPayroll && Number.isFinite(payrollNeedsReviewCount) ? payrollNeedsReviewCount : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
        </div>

        <Card title="عناصر تحتاج مراجعة">
          {reviewItems.length ? (
            <DataTable
              rows={reviewItems}
              rowKey={(row) => row.id}
              density="compact"
              columns={[
                { key: 'type', header: 'النوع', cell: (row) => row.type },
                { key: 'employee', header: 'الموظف / الكود', cell: (row) => row.employee },
                { key: 'description', header: 'الوصف المختصر', cell: (row) => row.description },
                {
                  key: 'action',
                  header: 'الإجراء',
                  cell: (row) => (
                    <Button variant="secondary" onClick={() => navigate(row.to)}>
                      {row.actionLabel}
                    </Button>
                  ),
                },
              ]}
            />
          ) : (
            <p className="muted" style={{ margin: 0 }}>لا توجد عناصر مراجعة عاجلة حاليًا.</p>
          )}
        </Card>

        <Card title="اختصارات الموارد البشرية">
          <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
            {canViewEmployees ? <Button variant="secondary" onClick={() => navigate('/hr/employees')}>الموظفون</Button> : null}
            {canViewAttendance ? <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>الحضور والانصراف</Button> : null}
            {canViewLeaves ? <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>الإجازات</Button> : null}
            {canViewPayroll ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>المرتبات</Button> : null}
            {canViewLoans ? <Button variant="secondary" onClick={() => navigate('/hr/loans')}>السلف</Button> : null}
            {canViewDocuments ? <Button variant="secondary" onClick={() => navigate('/hr/documents')}>المستندات</Button> : null}
            {canViewAssets ? <Button variant="secondary" onClick={() => navigate('/hr/assets')}>العُهد</Button> : null}
            {canViewReports ? <Button variant="secondary" onClick={() => navigate('/hr/reports')}>التقارير</Button> : null}
            {canManageSettings ? <Button variant="secondary" onClick={() => navigate('/hr/settings')}>الإعدادات</Button> : null}
          </div>
        </Card>

        <Card title="جاهزية إعدادات الموارد البشرية">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>العنصر</th>
                  <th>القيمة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {setupRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{typeof row.value === 'number' ? row.value : row.value}</td>
                    <td>{row.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            بعض إعدادات الموارد البشرية المتقدمة غير متاحة من البيانات الحالية.
          </p>
        </Card>
      </QueryFeedback>
    </div>
  );
}
