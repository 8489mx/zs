import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import type {
  HrAttendanceRecord,
  HrEmployee,
  HrEmployeeAsset,
  HrLeaveRequest,
  HrLeaveType,
  HrLoan,
} from '@/types/domain';
import {
  useHrAttendance,
  useHrEmployeeAssets,
  useHrLeaveRequests,
  useHrLeaveTypes,
  useHrMutations,
  useHrReportsSummary,
  useHrWorkspace,
} from '@/features/hr/hooks/useHr';

type TabKey =
  | 'overview'
  | 'employees'
  | 'attendance'
  | 'leaves'
  | 'payroll-loans'
  | 'assets';
type PanelKey = 'employee' | 'attendance' | 'leave' | 'loan' | 'asset' | null;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate(dateValue: string) {
  return `${dateValue.slice(0, 7)}-01`;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function fallback(value: unknown) {
  return text(value) || '—';
}

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

function attendanceStatusLabel(value: unknown) {
  const status = text(value);
  if (status === 'present') return 'حاضر';
  if (status === 'absent') return 'غائب';
  if (status === 'late') return 'متأخر';
  if (status === 'half_day') return 'نصف يوم';
  if (status === 'leave') return 'إجازة';
  if (status === 'excused') return 'بعذر';
  if (status === 'early_leave') return 'انصراف مبكر';
  return 'غير مسجل';
}

function leaveStatusLabel(value: unknown) {
  const status = text(value);
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'approved') return 'معتمدة';
  if (status === 'rejected') return 'مرفوضة';
  if (status === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

function assetStatusLabel(value: unknown) {
  const status = text(value);
  if (status === 'assigned') return 'مسلّمة';
  if (status === 'returned') return 'تم الاسترداد';
  if (status === 'lost') return 'مفقودة';
  if (status === 'damaged') return 'تالفة';
  if (status === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

function employeeLabel(employee: HrEmployee) {
  return fallback(
    employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
  );
}

function inclusiveDays(from: string, to: string) {
  if (!from || !to) return '';
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
    return '';
  }
  return String(Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
}

function toDateTime(workDate: string, timeValue: string) {
  if (!workDate || !timeValue) return undefined;
  return `${workDate}T${timeValue}:00Z`;
}

export function HrComingSoonPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const [today] = useState(todayDate());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('all');

  const [employeeDraft, setEmployeeDraft] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    hireDate: today,
  });
  const [attendanceDraft, setAttendanceDraft] = useState({
    employeeId: '',
    status: 'present',
    checkInAt: '',
    checkOutAt: '',
    notes: '',
  });
  const [leaveDraft, setLeaveDraft] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: today,
    endDate: today,
    daysCount: '1',
    reason: '',
    notes: '',
  });
  const [loanDraft, setLoanDraft] = useState({
    employeeId: '',
    loanType: 'advance',
    principalAmount: '',
    issueDate: today,
    notes: '',
  });
  const [assetDraft, setAssetDraft] = useState({
    employeeId: '',
    assetType: 'جهاز',
    assetName: '',
    assetCode: '',
    serialNo: '',
    assignedAt: today,
    notes: '',
  });

  const [panelError, setPanelError] = useState('');

  const month = today.slice(0, 7);
  const reportsQuery = useHrReportsSummary({
    from: monthStartDate(today),
    to: today,
    month,
  });
  const workspace = useHrWorkspace({ page: 1, pageSize: 200, month });
  const attendanceQuery = useHrAttendance({ date: today, page: 1, pageSize: 40 });
  const leaveRequestsQuery = useHrLeaveRequests({ page: 1, pageSize: 40 });
  const leaveTypesQuery = useHrLeaveTypes({ page: 1, pageSize: 100 });
  const assetsQuery = useHrEmployeeAssets({ page: 1, pageSize: 40 });

  const summary = reportsQuery.data?.summary;
  const employees = useMemo(
    () => (workspace.employees.data?.employees || []) as HrEmployee[],
    [workspace.employees.data?.employees],
  );
  const loans = useMemo(
    () => (workspace.loans.data?.loans || []) as HrLoan[],
    [workspace.loans.data?.loans],
  );
  const attendanceRows = useMemo(
    () => (attendanceQuery.data?.rows || []) as HrAttendanceRecord[],
    [attendanceQuery.data?.rows],
  );
  const leaveRequests = useMemo(
    () => (leaveRequestsQuery.data?.requests || []) as HrLeaveRequest[],
    [leaveRequestsQuery.data?.requests],
  );
  const leaveTypes = useMemo(
    () => (leaveTypesQuery.data?.rows || []) as HrLeaveType[],
    [leaveTypesQuery.data?.rows],
  );
  const assets = useMemo(
    () => (assetsQuery.data?.assets || []) as HrEmployeeAsset[],
    [assetsQuery.data?.assets],
  );

  const filteredEmployees = useMemo(() => {
    const search = text(employeeSearch).toLowerCase();
    return employees.filter((row) => {
      if (employeeStatus !== 'all' && text(row.status) !== employeeStatus) return false;
      if (!search) return true;
      const blob =
        `${row.employeeNo || ''} ${employeeLabel(row)} ${row.departmentName || ''} ${row.jobTitleName || ''}`
          .toLowerCase();
      return blob.includes(search);
    });
  }, [employees, employeeSearch, employeeStatus]);

  const openTabPanel = (tab: TabKey, panel: PanelKey) => {
    setActiveTab(tab);
    setOpenPanel(panel);
    setPanelError('');
  };

  const closePanel = () => {
    setOpenPanel(null);
    setPanelError('');
  };

  async function handleQuickEmployeeCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPanelError('');
    const firstName = text(employeeDraft.firstName);
    const mobile = text(employeeDraft.mobile);
    const hireDate = text(employeeDraft.hireDate);
    if (!firstName) return setPanelError('الاسم الأول مطلوب.');
    if (!mobile) return setPanelError('الموبايل مطلوب.');
    if (!hireDate) return setPanelError('تاريخ التعيين مطلوب.');

    try {
      const result = await mutations.saveEmployee.mutateAsync({
        payload: {
          firstName,
          lastName: text(employeeDraft.lastName) || undefined,
          status: 'active',
          hireDate,
        },
      });
      const createdId = String(
        (
          result as { employees?: Array<{ id?: string | number; firstName?: string }> }
        )?.employees?.find((row) => text(row.firstName) === firstName)?.id || '',
      );
      if (createdId) {
        await mutations.saveContact.mutateAsync({
          employeeId: createdId,
          payload: {
            contactType: 'phone',
            value: mobile,
            label: 'الموبايل',
            isPrimary: true,
          },
        });
      }
      setEmployeeDraft({ firstName: '', lastName: '', mobile: '', hireDate: today });
      closePanel();
    } catch (error) {
      setPanelError(getErrorMessage(error, 'تعذر إضافة الموظف.'));
    }
  }

  async function handleAttendanceSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPanelError('');
    if (!attendanceDraft.employeeId) return setPanelError('اختيار الموظف مطلوب.');
    if (!attendanceDraft.status) return setPanelError('الحالة مطلوبة.');

    try {
      await mutations.saveAttendanceRecord.mutateAsync({
        employeeId: Number(attendanceDraft.employeeId),
        workDate: today,
        status: attendanceDraft.status,
        checkInAt: toDateTime(today, attendanceDraft.checkInAt),
        checkOutAt: toDateTime(today, attendanceDraft.checkOutAt),
        source: 'manual',
        notes: text(attendanceDraft.notes) || undefined,
      });
      setAttendanceDraft({
        employeeId: '',
        status: 'present',
        checkInAt: '',
        checkOutAt: '',
        notes: '',
      });
      closePanel();
    } catch (error) {
      setPanelError(getErrorMessage(error, 'تعذر تسجيل الحضور.'));
    }
  }

  async function handleLeaveCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPanelError('');
    if (!leaveDraft.employeeId) return setPanelError('اختيار الموظف مطلوب.');
    if (!leaveDraft.leaveTypeId) return setPanelError('نوع الإجازة مطلوب.');
    if (!leaveDraft.startDate) return setPanelError('تاريخ البداية مطلوب.');
    if (!leaveDraft.endDate) return setPanelError('تاريخ النهاية مطلوب.');

    const leaveType = leaveTypes.find((row) => String(row.id) === leaveDraft.leaveTypeId);
    try {
      await mutations.createLeaveRequest.mutateAsync({
        employeeId: Number(leaveDraft.employeeId),
        leaveTypeId: Number(leaveDraft.leaveTypeId),
        leaveType: text(leaveType?.name) || undefined,
        startDate: leaveDraft.startDate,
        endDate: leaveDraft.endDate,
        daysCount: Number(
          leaveDraft.daysCount || inclusiveDays(leaveDraft.startDate, leaveDraft.endDate) || 1,
        ),
        reason: text(leaveDraft.reason) || undefined,
        notes: text(leaveDraft.notes) || undefined,
      });
      setLeaveDraft({
        employeeId: '',
        leaveTypeId: '',
        startDate: today,
        endDate: today,
        daysCount: '1',
        reason: '',
        notes: '',
      });
      closePanel();
    } catch (error) {
      setPanelError(getErrorMessage(error, 'تعذر تسجيل طلب الإجازة.'));
    }
  }

  async function handleLoanCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPanelError('');
    if (!loanDraft.employeeId) return setPanelError('اختيار الموظف مطلوب.');
    if (!Number(loanDraft.principalAmount || 0)) return setPanelError('قيمة السلفة مطلوبة.');

    try {
      await mutations.saveLoan.mutateAsync({
        payload: {
          employeeId: loanDraft.employeeId,
          loanType: loanDraft.loanType,
          principalAmount: Number(loanDraft.principalAmount),
          installmentCount: 1,
          issueDate: loanDraft.issueDate,
          notes: text(loanDraft.notes) || undefined,
        },
      });
      setLoanDraft({
        employeeId: '',
        loanType: 'advance',
        principalAmount: '',
        issueDate: today,
        notes: '',
      });
      closePanel();
    } catch (error) {
      setPanelError(getErrorMessage(error, 'تعذر إضافة السلفة.'));
    }
  }

  async function handleAssetCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPanelError('');
    if (!assetDraft.employeeId) return setPanelError('اختيار الموظف مطلوب.');
    if (!text(assetDraft.assetType)) return setPanelError('نوع العهدة مطلوب.');
    if (!text(assetDraft.assetName)) return setPanelError('اسم العهدة مطلوب.');

    try {
      await mutations.saveEmployeeAsset.mutateAsync({
        payload: {
          employeeId: Number(assetDraft.employeeId),
          assetType: assetDraft.assetType,
          assetName: assetDraft.assetName,
          assetCode: text(assetDraft.assetCode) || undefined,
          serialNo: text(assetDraft.serialNo) || undefined,
          assignedAt: assetDraft.assignedAt,
          notes: text(assetDraft.notes) || undefined,
        },
      });
      setAssetDraft({
        employeeId: '',
        assetType: 'جهاز',
        assetName: '',
        assetCode: '',
        serialNo: '',
        assignedAt: today,
        notes: '',
      });
      closePanel();
    } catch (error) {
      setPanelError(getErrorMessage(error, 'تعذر تسجيل العهدة.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الموارد البشرية"
        description="إدارة الموظفين، الحضور، الإجازات، المرتبات، والعهد من مكان واحد."
        actions={(
          <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
            <Button onClick={() => openTabPanel('employees', 'employee')}>إضافة موظف</Button>
            <Button variant="secondary" onClick={() => openTabPanel('attendance', 'attendance')}>
              تسجيل حضور/انصراف
            </Button>
            <Button variant="secondary" onClick={() => openTabPanel('leaves', 'leave')}>
              طلب إجازة
            </Button>
            <Button variant="secondary" onClick={() => openTabPanel('payroll-loans', 'loan')}>
              إضافة سلفة/خصم
            </Button>
          </div>
        )}
      />

      <Card>
        <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
          <Button variant={activeTab === 'overview' ? 'primary' : 'secondary'} onClick={() => setActiveTab('overview')}>نظرة عامة</Button>
          <Button variant={activeTab === 'employees' ? 'primary' : 'secondary'} onClick={() => setActiveTab('employees')}>الموظفون</Button>
          <Button variant={activeTab === 'attendance' ? 'primary' : 'secondary'} onClick={() => setActiveTab('attendance')}>الحضور والانصراف</Button>
          <Button variant={activeTab === 'leaves' ? 'primary' : 'secondary'} onClick={() => setActiveTab('leaves')}>الإجازات</Button>
          <Button variant={activeTab === 'payroll-loans' ? 'primary' : 'secondary'} onClick={() => setActiveTab('payroll-loans')}>المرتبات والسلف</Button>
          <Button variant={activeTab === 'assets' ? 'primary' : 'secondary'} onClick={() => setActiveTab('assets')}>العهد</Button>
        </div>
      </Card>

      {activeTab === 'overview' ? (
        <>
          <QueryFeedback isLoading={reportsQuery.isLoading} isError={reportsQuery.isError} error={reportsQuery.error}>
            <Card title="ملخص تشغيلي">
              <div className="stats-grid">
                <div><strong>الموظفون النشطون:</strong> {Number(summary?.activeEmployeeCount || 0)}</div>
                <div><strong>الحضور اليوم:</strong> {Number(summary?.attendance?.presentCount || 0)}</div>
                <div><strong>الغياب اليوم:</strong> {Number(summary?.attendance?.absentCount || 0)}</div>
                <div><strong>إجازات بانتظار الموافقة:</strong> {Number(summary?.leaves?.pendingCount || 0)}</div>
                <div><strong>سلف/خصومات هذا الشهر:</strong> {money(summary?.loans?.outstandingAmount || 0)}</div>
              </div>
            </Card>
          </QueryFeedback>
          <Card title="اختصارات التشغيل">
            <div className="grid-3" style={{ gap: 10 }}>
              <div className="card" style={{ padding: 12 }}><strong>الموظفون</strong><p className="muted small">إدارة ملفات الموظفين الأساسية.</p><Button variant="secondary" onClick={() => setActiveTab('employees')}>فتح داخل الصفحة</Button></div>
              <div className="card" style={{ padding: 12 }}><strong>الحضور والانصراف</strong><p className="muted small">متابعة حضور وانصراف اليوم.</p><Button variant="secondary" onClick={() => setActiveTab('attendance')}>فتح داخل الصفحة</Button></div>
              <div className="card" style={{ padding: 12 }}><strong>الإجازات</strong><p className="muted small">متابعة طلبات الإجازات واعتمادها.</p><Button variant="secondary" onClick={() => setActiveTab('leaves')}>فتح داخل الصفحة</Button></div>
              <div className="card" style={{ padding: 12 }}><strong>المرتبات والسلف</strong><p className="muted small">مراجعة المرتبات والسلف والخصومات.</p><Button variant="secondary" onClick={() => setActiveTab('payroll-loans')}>فتح داخل الصفحة</Button></div>
              <div className="card" style={{ padding: 12 }}><strong>العهد</strong><p className="muted small">تسجيل وتسليم واسترداد العهد.</p><Button variant="secondary" onClick={() => setActiveTab('assets')}>فتح داخل الصفحة</Button></div>
            </div>
          </Card>
        </>
      ) : null}

      {activeTab === 'employees' ? (
        <>
          <Card title="الموظفون">
            <div className="compact-actions" style={{ marginBottom: 12 }}>
              <SearchToolbar search={employeeSearch} onSearchChange={setEmployeeSearch} searchPlaceholder="بحث عن موظف" inputAriaLabel="بحث الموظفين" />
              <select value={employeeStatus} onChange={(event) => setEmployeeStatus(event.target.value)}>
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              <Button onClick={() => openTabPanel('employees', 'employee')}>إضافة موظف</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>فتح الصفحة الكاملة</Button>
            </div>
            {filteredEmployees.length ? (
              <DataTable
                rows={filteredEmployees.slice(0, 20)}
                rowKey={(row) => String(row.id)}
                density="compact"
                columns={[
                  { key: 'employeeNo', header: 'الكود', cell: (row) => fallback(row.employeeNo) },
                  { key: 'name', header: 'الموظف', cell: (row) => employeeLabel(row) },
                  { key: 'department', header: 'القسم', cell: (row) => fallback(row.departmentName) },
                  { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => fallback(row.jobTitleName) },
                  { key: 'status', header: 'الحالة', cell: (row) => (text(row.status) === 'active' ? 'نشط' : 'غير نشط') },
                ]}
              />
            ) : <p className="muted">لا توجد بيانات موظفين كافية للعرض حاليًا.</p>}
          </Card>
          {openPanel === 'employee' ? (
            <Card title="إضافة موظف" description="نموذج سريع داخل الصفحة، ويمكن فتح صفحة الإضافة الكاملة عند الحاجة.">
              <form className="form-grid" onSubmit={(event) => { void handleQuickEmployeeCreate(event); }}>
                <label className="field"><span>الاسم الأول *</span><input value={employeeDraft.firstName} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, firstName: event.target.value }))} /></label>
                <label className="field"><span>اسم العائلة</span><input value={employeeDraft.lastName} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, lastName: event.target.value }))} /></label>
                <label className="field"><span>الموبايل *</span><input value={employeeDraft.mobile} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, mobile: event.target.value }))} /></label>
                <label className="field"><span>تاريخ التعيين *</span><input type="date" value={employeeDraft.hireDate} onChange={(event) => setEmployeeDraft((prev) => ({ ...prev, hireDate: event.target.value }))} /></label>
                {panelError ? <div className="field-wide error-box">{panelError}</div> : null}
                <div className="actions compact-actions field-wide">
                  <Button type="submit" disabled={mutations.saveEmployee.isPending || mutations.saveContact.isPending}>حفظ الموظف</Button>
                  <Button type="button" variant="secondary" onClick={closePanel}>إغلاق</Button>
                  <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees/new')}>فتح صفحة إضافة الموظف الكاملة</Button>
                </div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === 'attendance' ? (
        <>
          <Card title="الحضور والانصراف اليومي">
            <div className="stats-grid">
              <div><strong>حاضر:</strong> {Number(attendanceQuery.data?.summary?.presentCount || 0)}</div>
              <div><strong>غائب:</strong> {Number(attendanceQuery.data?.summary?.absentCount || 0)}</div>
              <div><strong>متأخر:</strong> {Number(attendanceQuery.data?.summary?.lateCount || 0)}</div>
              <div><strong>إجازة:</strong> {Number(attendanceQuery.data?.summary?.leaveCount || 0)}</div>
            </div>
            <div className="actions compact-actions" style={{ marginTop: 10 }}>
              <Button onClick={() => openTabPanel('attendance', 'attendance')}>تسجيل حضور/انصراف</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الصفحة الكاملة</Button>
            </div>
          </Card>
          <Card title="سجلات اليوم المختصرة">
            <QueryFeedback isLoading={attendanceQuery.isLoading} isError={attendanceQuery.isError} error={attendanceQuery.error} isEmpty={!attendanceRows.length} emptyTitle="لا توجد سجلات حضور اليوم.">
              <DataTable
                rows={attendanceRows.slice(0, 12)}
                rowKey={(row) => `${row.employeeId}-${row.workDate}`}
                density="compact"
                columns={[
                  { key: 'employeeNo', header: 'الكود', cell: (row) => fallback(row.employeeNo) },
                  { key: 'employeeName', header: 'الموظف', cell: (row) => fallback(row.employeeName) },
                  { key: 'status', header: 'الحالة', cell: (row) => attendanceStatusLabel(row.status) },
                  { key: 'checkInAt', header: 'الحضور', cell: (row) => fallback(row.checkInAt) },
                  { key: 'checkOutAt', header: 'الانصراف', cell: (row) => fallback(row.checkOutAt) },
                ]}
              />
            </QueryFeedback>
          </Card>
          {openPanel === 'attendance' ? (
            <Card title="تسجيل حضور/انصراف">
              <form className="form-grid" onSubmit={(event) => { void handleAttendanceSave(event); }}>
                <label className="field"><span>الموظف *</span><select value={attendanceDraft.employeeId} onChange={(event) => setAttendanceDraft((prev) => ({ ...prev, employeeId: event.target.value }))}><option value="">اختر الموظف</option>{employees.map((row) => <option key={row.id} value={row.id}>{employeeLabel(row)}</option>)}</select></label>
                <label className="field"><span>الحالة</span><select value={attendanceDraft.status} onChange={(event) => setAttendanceDraft((prev) => ({ ...prev, status: event.target.value }))}><option value="present">حاضر</option><option value="absent">غائب</option><option value="late">متأخر</option><option value="half_day">نصف يوم</option><option value="leave">إجازة</option><option value="excused">بعذر</option><option value="early_leave">انصراف مبكر</option></select></label>
                <label className="field"><span>وقت الحضور</span><input type="time" value={attendanceDraft.checkInAt} onChange={(event) => setAttendanceDraft((prev) => ({ ...prev, checkInAt: event.target.value }))} /></label>
                <label className="field"><span>وقت الانصراف</span><input type="time" value={attendanceDraft.checkOutAt} onChange={(event) => setAttendanceDraft((prev) => ({ ...prev, checkOutAt: event.target.value }))} /></label>
                <label className="field field-wide"><span>ملاحظات</span><input value={attendanceDraft.notes} onChange={(event) => setAttendanceDraft((prev) => ({ ...prev, notes: event.target.value }))} /></label>
                {panelError ? <div className="field-wide error-box">{panelError}</div> : null}
                <div className="actions compact-actions field-wide"><Button type="submit" disabled={mutations.saveAttendanceRecord.isPending}>حفظ</Button><Button type="button" variant="secondary" onClick={closePanel}>إغلاق</Button></div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === 'leaves' ? (
        <>
          <Card title="الإجازات">
            <div className="stats-grid">
              <div><strong>طلبات معلقة:</strong> {Number(leaveRequestsQuery.data?.summary?.pendingCount || 0)}</div>
              <div><strong>إجازات معتمدة:</strong> {Number(leaveRequestsQuery.data?.summary?.approvedCount || 0)}</div>
              <div><strong>إجازات مرفوضة:</strong> {Number(leaveRequestsQuery.data?.summary?.rejectedCount || 0)}</div>
            </div>
            <div className="actions compact-actions" style={{ marginTop: 10 }}>
              <Button onClick={() => openTabPanel('leaves', 'leave')}>طلب إجازة جديد</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>فتح الصفحة الكاملة</Button>
            </div>
          </Card>
          <Card title="قائمة مختصرة للطلبات">
            {leaveRequests.length ? (
              <DataTable
                rows={leaveRequests.slice(0, 12)}
                rowKey={(row) => String(row.id)}
                density="compact"
                columns={[
                  { key: 'employeeName', header: 'الموظف', cell: (row) => fallback(row.employeeName) },
                  { key: 'leaveType', header: 'النوع', cell: (row) => fallback(row.leaveTypeName || row.leaveType) },
                  { key: 'startDate', header: 'من', cell: (row) => fallback(row.startDate) },
                  { key: 'endDate', header: 'إلى', cell: (row) => fallback(row.endDate) },
                  { key: 'status', header: 'الحالة', cell: (row) => leaveStatusLabel(row.status) },
                ]}
              />
            ) : <p className="muted">لا توجد طلبات إجازة حالية.</p>}
          </Card>
          {openPanel === 'leave' ? (
            <Card title="طلب إجازة جديد">
              <form className="form-grid" onSubmit={(event) => { void handleLeaveCreate(event); }}>
                <label className="field"><span>الموظف *</span><select value={leaveDraft.employeeId} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, employeeId: event.target.value }))}><option value="">اختر الموظف</option>{employees.map((row) => <option key={row.id} value={row.id}>{employeeLabel(row)}</option>)}</select></label>
                <label className="field"><span>نوع الإجازة *</span><select value={leaveDraft.leaveTypeId} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, leaveTypeId: event.target.value }))}><option value="">اختر النوع</option>{leaveTypes.map((row) => <option key={row.id} value={row.id}>{fallback(row.name)}</option>)}</select></label>
                <label className="field"><span>من تاريخ *</span><input type="date" value={leaveDraft.startDate} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, startDate: event.target.value, daysCount: inclusiveDays(event.target.value, prev.endDate) || prev.daysCount }))} /></label>
                <label className="field"><span>إلى تاريخ *</span><input type="date" value={leaveDraft.endDate} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, endDate: event.target.value, daysCount: inclusiveDays(prev.startDate, event.target.value) || prev.daysCount }))} /></label>
                <label className="field"><span>عدد الأيام</span><input type="number" min="0.5" step="0.5" value={leaveDraft.daysCount} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, daysCount: event.target.value }))} /></label>
                <label className="field field-wide"><span>السبب</span><input value={leaveDraft.reason} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, reason: event.target.value }))} /></label>
                <label className="field field-wide"><span>ملاحظات</span><input value={leaveDraft.notes} onChange={(event) => setLeaveDraft((prev) => ({ ...prev, notes: event.target.value }))} /></label>
                {panelError ? <div className="field-wide error-box">{panelError}</div> : null}
                <div className="actions compact-actions field-wide"><Button type="submit" disabled={mutations.createLeaveRequest.isPending}>تسجيل الطلب</Button><Button type="button" variant="secondary" onClick={closePanel}>إغلاق</Button></div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === 'payroll-loans' ? (
        <>
          <Card title="المرتبات والسلف">
            <div className="stats-grid">
              <div><strong>إجمالي المرتبات:</strong> {money(summary?.payroll?.totalNetPay || 0)}</div>
              <div><strong>إجمالي السلف:</strong> {money(summary?.loans?.outstandingAmount || 0)}</div>
              <div><strong>إجمالي الخصومات:</strong> {money(0)}</div>
              <div><strong>صافي المستحق:</strong> {money(summary?.payroll?.totalNetPay || 0)}</div>
            </div>
            <div className="actions compact-actions" style={{ marginTop: 10 }}>
              <Button onClick={() => openTabPanel('payroll-loans', 'loan')}>إضافة سلفة/خصم</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف والخصومات</Button>
            </div>
          </Card>
          <Card title="آخر السلف المسجلة">
            {loans.length ? (
              <DataTable
                rows={loans.slice(0, 10)}
                rowKey={(row) => String(row.id)}
                density="compact"
                columns={[
                  { key: 'loanNo', header: 'رقم السلفة', cell: (row) => fallback(row.loanNo || row.id) },
                  { key: 'employeeName', header: 'الموظف', cell: (row) => fallback(row.employeeName) },
                  { key: 'principalAmount', header: 'القيمة', cell: (row) => money(row.principalAmount) },
                  { key: 'remainingAmount', header: 'المتبقي', cell: (row) => money(row.remainingAmount) },
                  { key: 'status', header: 'الحالة', cell: (row) => fallback(row.status) },
                ]}
              />
            ) : <p className="muted">لا توجد سلف مسجلة حاليًا.</p>}
          </Card>
          {openPanel === 'loan' ? (
            <Card title="إضافة سلفة/خصم">
              <form className="form-grid" onSubmit={(event) => { void handleLoanCreate(event); }}>
                <label className="field"><span>الموظف *</span><select value={loanDraft.employeeId} onChange={(event) => setLoanDraft((prev) => ({ ...prev, employeeId: event.target.value }))}><option value="">اختر الموظف</option>{employees.map((row) => <option key={row.id} value={row.id}>{employeeLabel(row)}</option>)}</select></label>
                <label className="field"><span>النوع</span><select value={loanDraft.loanType} onChange={(event) => setLoanDraft((prev) => ({ ...prev, loanType: event.target.value }))}><option value="advance">سلفة</option><option value="deduction">خصم</option><option value="other">أخرى</option></select></label>
                <label className="field"><span>قيمة السلفة *</span><input type="number" min="0" step="0.01" value={loanDraft.principalAmount} onChange={(event) => setLoanDraft((prev) => ({ ...prev, principalAmount: event.target.value }))} /></label>
                <label className="field"><span>تاريخ السلفة</span><input type="date" value={loanDraft.issueDate} onChange={(event) => setLoanDraft((prev) => ({ ...prev, issueDate: event.target.value }))} /></label>
                <label className="field field-wide"><span>ملاحظات</span><input value={loanDraft.notes} onChange={(event) => setLoanDraft((prev) => ({ ...prev, notes: event.target.value }))} /></label>
                {panelError ? <div className="field-wide error-box">{panelError}</div> : null}
                <div className="actions compact-actions field-wide"><Button type="submit" disabled={mutations.saveLoan.isPending}>حفظ</Button><Button type="button" variant="secondary" onClick={closePanel}>إغلاق</Button></div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === 'assets' ? (
        <>
          <Card title="العهد">
            <div className="stats-grid">
              <div><strong>إجمالي العهد:</strong> {Number(assetsQuery.data?.summary?.totalItems || 0)}</div>
              <div><strong>العهد المسلّمة:</strong> {Number(assetsQuery.data?.summary?.assignedCount || 0)}</div>
              <div><strong>العهد المرتجعة:</strong> {Number(assetsQuery.data?.summary?.returnedCount || 0)}</div>
            </div>
            <div className="actions compact-actions" style={{ marginTop: 10 }}>
              <Button onClick={() => openTabPanel('assets', 'asset')}>تسجيل عهدة</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/assets')}>فتح الصفحة الكاملة</Button>
            </div>
          </Card>
          <Card title="قائمة العهد المختصرة">
            {assets.length ? (
              <DataTable
                rows={assets.slice(0, 12)}
                rowKey={(row) => String(row.id)}
                density="compact"
                columns={[
                  { key: 'employeeName', header: 'الموظف', cell: (row) => fallback(row.employeeName) },
                  { key: 'assetType', header: 'نوع العهدة', cell: (row) => fallback(row.assetType) },
                  { key: 'assetName', header: 'اسم العهدة', cell: (row) => fallback(row.assetName) },
                  { key: 'status', header: 'الحالة', cell: (row) => assetStatusLabel(row.status) },
                  { key: 'assignedAt', header: 'تاريخ التسليم', cell: (row) => fallback(row.assignedAt) },
                ]}
              />
            ) : <p className="muted">لا توجد بيانات عهد كافية للعرض حاليًا.</p>}
          </Card>
          {openPanel === 'asset' ? (
            <Card title="تسجيل عهدة">
              <form className="form-grid" onSubmit={(event) => { void handleAssetCreate(event); }}>
                <label className="field"><span>الموظف *</span><select value={assetDraft.employeeId} onChange={(event) => setAssetDraft((prev) => ({ ...prev, employeeId: event.target.value }))}><option value="">اختر الموظف</option>{employees.map((row) => <option key={row.id} value={row.id}>{employeeLabel(row)}</option>)}</select></label>
                <label className="field"><span>نوع العهدة *</span><input value={assetDraft.assetType} onChange={(event) => setAssetDraft((prev) => ({ ...prev, assetType: event.target.value }))} /></label>
                <label className="field"><span>اسم العهدة *</span><input value={assetDraft.assetName} onChange={(event) => setAssetDraft((prev) => ({ ...prev, assetName: event.target.value }))} /></label>
                <label className="field"><span>كود/سيريال</span><input value={assetDraft.assetCode} onChange={(event) => setAssetDraft((prev) => ({ ...prev, assetCode: event.target.value }))} /></label>
                <label className="field"><span>تاريخ التسليم</span><input type="date" value={assetDraft.assignedAt} onChange={(event) => setAssetDraft((prev) => ({ ...prev, assignedAt: event.target.value }))} /></label>
                <label className="field field-wide"><span>ملاحظات</span><input value={assetDraft.notes} onChange={(event) => setAssetDraft((prev) => ({ ...prev, notes: event.target.value }))} /></label>
                {panelError ? <div className="field-wide error-box">{panelError}</div> : null}
                <div className="actions compact-actions field-wide"><Button type="submit" disabled={mutations.saveEmployeeAsset.isPending}>حفظ</Button><Button type="button" variant="secondary" onClick={closePanel}>إغلاق</Button></div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
