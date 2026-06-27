import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { HrAttendanceException, HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan, HrPayrollRun } from '@/types/domain';
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
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canViewPayroll = useHasAnyPermission(['hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);

  const workspace = useHrWorkspace({ page: 1, pageSize: 200, month });
  const reports = useHrReportsSummary({ from: monthStartDate(today), to: today, month });
  const attendance = useHrAttendance({ date: today, page: 1, pageSize: 300 });
  const attendanceExceptions = useHrAttendanceExceptions({ date: today, page: 1, pageSize: 200 });
  const leaves = useHrLeaveRequests({ page: 1, pageSize: 200, status: 'pending' });
  const assets = useHrEmployeeAssets({ page: 1, pageSize: 300 });

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

  const loading = workspace.employees.isLoading || attendance.isLoading;
  const isError = workspace.employees.isError || attendance.isError;
  const error = workspace.employees.error || attendance.error;

  const navCards = [
    { title: 'الموظفون', body: 'إضافة وتعديل ملفات الموظفين واستكمال البيانات.', to: '/hr/employees', action: 'فتح الموظفين' },
    { title: 'الحضور والانصراف', body: 'تسجيل اليوم ومراجعة التأخير والأوفر تايم.', to: '/hr/attendance', action: 'فتح الحضور' },
    { title: 'الإجازات', body: 'مراجعة طلبات الإجازة وأنواع الإجازات.', to: '/hr/leaves', action: 'فتح الإجازات' },
    { title: 'السلف والخصومات', body: 'إدارة السلف وأقساط السداد الشهرية.', to: '/hr/loans', action: 'فتح السلف' },
    { title: 'المرتبات', body: 'مراجعة المرتبات والخصومات قبل الاعتماد.', to: '/hr/payroll', action: 'فتح المرتبات' },
    { title: 'الإعدادات', body: 'الأقسام والمسميات وأنواع الإجازات الأساسية.', to: '/hr/settings', action: 'فتح الإعدادات' },
  ];

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="الموارد البشرية"
        description="نظرة تشغيلية مختصرة: ابدأ من العناصر التي تحتاج إجراء، أو انتقل مباشرة للقسم المطلوب."
        actions={(
          <div className="compact-actions">
            <Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>
          </div>
        )}
      />

      <QueryFeedback
        isLoading={loading}
        isError={isError}
        error={error}
        isEmpty={false}
        loadingText="جاري تحميل نظرة الموارد البشرية..."
        errorTitle="تعذر تحميل نظرة الموارد البشرية"
      >
        <FormSection title="ملخص سريع" description="الأرقام المهمة اليوم بدون ازدحام.">
          <div className="stats-grid">
            <div className="stat-card"><span>إجمالي الموظفين</span><strong>{totalEmployees}</strong></div>
            <div className="stat-card"><span>نشط</span><strong>{activeEmployees}</strong></div>
            <div className="stat-card"><span>حاضر اليوم</span><strong>{presentToday}</strong></div>
            <div className="stat-card"><span>طلبات إجازة</span><strong>{pendingLeaves.length}</strong></div>
            <div className="stat-card"><span>استثناءات حضور</span><strong>{exceptionRows.length}</strong></div>
            <div className="stat-card"><span>عُهد تحتاج مراجعة</span><strong>{assetsNeedReview}</strong></div>
            <div className="stat-card"><span>أقساط سلف مستحقة</span><strong>{money(dueLoanAmount)}</strong></div>
            <div className="stat-card"><span>مرتبات تحتاج مراجعة</span><strong>{payrollReviewCount}</strong></div>
          </div>
        </FormSection>

        <FormSection title="اختصارات العمل" description="ادخل مباشرة على المكان الصحيح بدل الرجوع للسايد بار.">
          <div className="form-grid">
            {navCards.map((card) => (
              <div key={card.to} className="field" style={{ alignItems: 'flex-start' }}>
                <strong>{card.title}</strong>
                <span className="muted">{card.body}</span>
                <Button type="button" variant="secondary" onClick={() => navigate(card.to)}>{card.action}</Button>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="يحتاج إجراء" description="أهم العناصر التي تستحق المتابعة الآن.">
          <DataTable
            rows={reviewItems}
            rowKey={(row) => row.id}
            density="compact"
            onRowClick={(row) => navigate(row.to)}
            columns={[
              { key: 'priority', header: 'الأولوية', cell: (row) => row.priority },
              { key: 'type', header: 'النوع', cell: (row) => row.type },
              { key: 'description', header: 'الوصف', cell: (row) => row.description },
              {
                key: 'action',
                header: 'الإجراء',
                cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }}>فتح</Button>,
              },
            ]}
          />
          {!reviewItems.length ? <p className="muted" style={{ margin: '12px 0 0' }}>لا توجد عناصر عاجلة ظاهرة حاليًا.</p> : null}
        </FormSection>
      </QueryFeedback>
      </main>
    </div>
  );
}
