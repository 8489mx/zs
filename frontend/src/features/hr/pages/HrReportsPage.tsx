import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan, HrPayrollRun } from '@/types/domain';
import {
  useHrAttendance,
  useHrEmployeeAssets,
  useHrLeaveRequests,
  useHrReportsSummary,
  useHrWorkspace,
} from '@/features/hr/hooks/useHr';
import {
  countText,
  employeeMatches,
  money,
  monthStartDate,
  normalize,
  reportTypeOptions,
  text,
  todayDate,
  type ReportType,
} from '@/features/hr/pages/reports/hr-reports.helpers';

function employeeName(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

function isActiveEmployee(row: HrEmployee) {
  return normalize(row.status) === 'active';
}

function isMissingEmployeeBasics(row: HrEmployee) {
  return !normalize(row.nationalId) || !normalize(row.departmentName) || !normalize(row.jobTitleName) || !normalize(row.hireDate);
}

function isOpenLoan(row: HrLoan) {
  const status = normalize(row.status);
  return Number(row.remainingAmount || 0) > 0 && status !== 'cancelled' && status !== 'repaid' && status !== 'paid';
}

function hasDueLoan(row: HrLoan) {
  return Number(row.dueInstallmentsAmount || 0) > 0 || Number(row.dueInstallmentsCount || 0) > 0;
}

function needsAssetReview(row: HrEmployeeAsset) {
  const status = normalize(row.status);
  return status === 'damaged' || status === 'lost' || (status === 'assigned' && !normalize(row.assignedAt));
}

function isOpenAsset(row: HrEmployeeAsset) {
  const status = normalize(row.status);
  return status === 'assigned' || status === 'damaged' || status === 'lost';
}

function leaveNeedsReview(row: HrLeaveRequest) {
  return normalize(row.status) === 'pending';
}

function isUnpaidLeave(row: HrLeaveRequest) {
  const typeText = normalize(row.leaveTypeName || row.leaveType || row.notes || row.reason);
  return typeText.includes('غير مدفوعة') || typeText.includes('unpaid');
}

function payrollRunNeedsReview(row: HrPayrollRun) {
  const status = normalize(row.status);
  return status === 'draft' || status === 'reviewed';
}

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

  const filteredEmployees = useMemo(
    () => employees.filter((employee) => employeeMatches(employee, search, departmentFilter)),
    [employees, search, departmentFilter],
  );

  const departmentOptions = useMemo(() => {
    const items = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (!key) continue;
      items.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(items.entries()).map(([value, label]) => ({ value, label }));
  }, [employees]);

  const employeesReport = useMemo(() => {
    const missingBasics = filteredEmployees.filter(isMissingEmployeeBasics).length;
    const missingNationalId = filteredEmployees.filter((employee) => !normalize(employee.nationalId)).length;
    const missingDepartmentOrTitle = filteredEmployees.filter((employee) => !normalize(employee.departmentName) || !normalize(employee.jobTitleName)).length;
    const missingWorkSchedule = filteredEmployees.filter((employee) => !normalize(employee.scheduledCheckInTime) || !normalize(employee.scheduledCheckOutTime)).length;

    return {
      total: filteredEmployees.length,
      active: filteredEmployees.filter(isActiveEmployee).length,
      inactive: filteredEmployees.filter((employee) => !isActiveEmployee(employee)).length,
      missingBasics,
      missingNationalId,
      missingDepartmentOrTitle,
      missingWorkSchedule,
    };
  }, [filteredEmployees]);

  const attendanceReport = useMemo(() => ({
    total: countText(attendanceQuery.data?.summary?.totalItems),
    present: countText(summary?.attendance?.presentCount),
    absent: countText(summary?.attendance?.absentCount),
    late: countText(summary?.attendance?.lateCount),
    needsReview: countText(attendanceQuery.data?.summary?.unmarkedCount),
  }), [attendanceQuery.data?.summary?.totalItems, attendanceQuery.data?.summary?.unmarkedCount, summary?.attendance]);

  const leavesReport = useMemo(() => ({
    total: countText(leavesQuery.data?.summary?.totalItems),
    pending: countText(summary?.leaves?.pendingCount ?? leaves.filter(leaveNeedsReview).length),
    approved: countText(summary?.leaves?.approvedCount),
    rejected: countText(summary?.leaves?.rejectedCount),
    unpaid: countText(summary?.leaves?.unpaidLeaveDays ?? leaves.filter(isUnpaidLeave).length),
  }), [leaves, leavesQuery.data?.summary?.totalItems, summary?.leaves]);

  const loansReport = useMemo(() => {
    const openLoans = loans.filter(isOpenLoan);
    const dueLoans = loans.filter(hasDueLoan);
    return {
      total: loans.length,
      open: openLoans.length,
      dueCount: dueLoans.length,
      dueAmount: dueLoans.reduce((sum, row) => sum + Number(row.dueInstallmentsAmount || 0), 0),
      remainingAmount: openLoans.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0),
    };
  }, [loans]);

  const assetsReport = useMemo(() => {
    const openAssets = assets.filter(isOpenAsset);
    const reviewAssets = assets.filter(needsAssetReview);
    return {
      total: assets.length,
      assigned: assets.filter((row) => normalize(row.status) === 'assigned').length,
      returned: assets.filter((row) => normalize(row.status) === 'returned').length,
      damaged: assets.filter((row) => normalize(row.status) === 'damaged').length,
      lost: assets.filter((row) => normalize(row.status) === 'lost').length,
      open: openAssets.length,
      needsReview: reviewAssets.length,
    };
  }, [assets]);

  const payrollReport = useMemo(() => {
    const run = payrollRuns.find((item) => normalize(item.periodMonth) === normalize(month)) || payrollRuns[0];
    const runItems = run?.items || [];
    const needsReview = runItems.filter((row) => {
      const unpaid = Number((row as { unpaidLeaveDays?: number }).unpaidLeaveDays || 0) > 0;
      const deduction = Number(row.deductionAmount || 0) > 0;
      const loan = Number(row.loanDeductionAmount || 0) > 0;
      const salaryMissing = Number(row.baseSalary || 0) <= 0;
      return unpaid || deduction || loan || salaryMissing;
    }).length;

    return {
      runs: payrollRuns.length,
      selectedRunStatus: text(run?.status),
      employeesInRun: countText(run?.itemCount || runItems.length),
      totalBase: money(run?.totalBaseSalary),
      totalDeduction: money(run?.totalDeductionAmount),
      totalLoan: money(run?.totalLoanDeductionAmount),
      totalNet: money(run?.totalNetPay || summary?.payroll?.totalNetPay),
      needsReview: countText(needsReview),
    };
  }, [month, payrollRuns, summary?.payroll?.totalNetPay]);

  const alerts = useMemo(() => {
    const rows: Array<{ id: string; type: string; target: string; note: string; action: string; to: string }> = [];

    filteredEmployees.filter(isMissingEmployeeBasics).slice(0, 20).forEach((employee) => {
      rows.push({
        id: `employee-${employee.id}`,
        type: 'ملف موظف',
        target: employeeName(employee),
        note: 'بيانات أساسية أو وظيفية ناقصة.',
        action: 'فتح الملف',
        to: `/hr/employees/${employee.id}`,
      });
    });

    leaves.filter(leaveNeedsReview).slice(0, 10).forEach((request) => {
      rows.push({
        id: `leave-${request.id}`,
        type: 'إجازات',
        target: text(request.employeeName),
        note: 'طلب إجازة قيد المراجعة.',
        action: 'فتح الإجازات',
        to: '/hr/leaves',
      });
    });

    loans.filter(hasDueLoan).slice(0, 10).forEach((loan) => {
      rows.push({
        id: `loan-${loan.id}`,
        type: 'سلف',
        target: text(loan.employeeName || loan.loanNo),
        note: `قسط مستحق هذا الشهر بقيمة ${money(loan.dueInstallmentsAmount || 0)}.`,
        action: 'فتح السلف',
        to: '/hr/loans',
      });
    });

    assets.filter(needsAssetReview).slice(0, 10).forEach((asset) => {
      rows.push({
        id: `asset-${asset.id}`,
        type: 'عُهد',
        target: text(asset.employeeName || asset.assetName),
        note: 'عهدة تالفة أو مفقودة أو ناقصة بيانات.',
        action: 'فتح العُهد',
        to: '/hr/assets',
      });
    });

    payrollRuns.filter(payrollRunNeedsReview).slice(0, 10).forEach((run) => {
      rows.push({
        id: `payroll-${run.id}`,
        type: 'مرتبات',
        target: text(run.periodMonth),
        note: 'مسير يحتاج مراجعة قبل الاعتماد النهائي.',
        action: 'فتح المرتبات',
        to: '/hr/payroll',
      });
    });

    const unmarked = Number(attendanceQuery.data?.summary?.unmarkedCount || 0);
    if (unmarked > 0) {
      rows.push({
        id: 'attendance-unmarked',
        type: 'حضور',
        target: 'سجلات الحضور',
        note: `يوجد ${unmarked} سجل حضور غير مكتمل ويحتاج مراجعة.`,
        action: 'فتح الحضور',
        to: '/hr/attendance',
      });
    }

    return rows.slice(0, 80);
  }, [assets, attendanceQuery.data?.summary?.unmarkedCount, filteredEmployees, leaves, loans, payrollRuns]);

  const hasAnyData = filteredEmployees.length > 0
    || loans.length > 0
    || leaves.length > 0
    || assets.length > 0
    || payrollRuns.length > 0
    || Number(summary?.employeeCount || 0) > 0;

  const loading = summaryQuery.isLoading || workspace.employees.isLoading || attendanceQuery.isLoading || leavesQuery.isLoading || assetsQuery.isLoading;
  const isError = summaryQuery.isError || workspace.employees.isError || attendanceQuery.isError || leavesQuery.isError || assetsQuery.isError;
  const error = summaryQuery.error || workspace.employees.error || attendanceQuery.error || leavesQuery.error || assetsQuery.error;
  const showSection = (type: ReportType) => reportType === 'all' || reportType === type;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="تقارير الموارد البشرية"
        description="ملخص تشغيلي سريع لكل دورة HR: الموظفين، الحضور، الإجازات، السلف، المرتبات، العُهد والتنبيهات."
        actions={(
          <div className="compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr')}>رجوع لنظرة الموارد البشرية</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
          </div>
        )}
      />

      <Card title="تسلسل قراءة التقرير" description="ابدأ بالتنبيهات، ثم راجع المؤشر المرتبط بها من الصفحة التشغيلية الصحيحة.">
        <div className="form-grid">
          <div className="field"><strong>1. راجع التنبيهات</strong><span className="muted">العناصر التي تحتاج إجراء تظهر أولًا في نهاية التقرير.</span></div>
          <div className="field"><strong>2. افهم السبب</strong><span className="muted">بيانات موظف ناقصة، حضور غير مكتمل، إجازة، سلفة، أو عهدة.</span></div>
          <div className="field"><strong>3. افتح الصفحة المناسبة</strong><span className="muted">كل تنبيه يحتوي إجراء يوجهك للمكان الصحيح.</span></div>
          <div className="field"><strong>4. اعتمد المرتبات بعد المراجعة</strong><span className="muted">التقرير يساعدك قبل الاعتماد وليس بديلًا عن المراجعة.</span></div>
        </div>
      </Card>

      <Card title="الفترة والفلاتر" description="تغيير الفترة أو القسم يحدّث المؤشرات والنتائج الظاهرة.">
        <div className="form-grid">
          <label className="field"><span>من تاريخ</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="field"><span>إلى تاريخ</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label className="field"><span>شهر المرتبات</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <label className="field"><span>السنة</span><input readOnly value={month.split('-')[0] || ''} /></label>
          <label className="field field-wide"><span>بحث الموظف</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اكتب اسم الموظف أو كوده" /></label>
          <label className="field">
            <span>القسم</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="all">الكل</option>
              {departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>نوع التقرير</span>
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>
              {reportTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <QueryFeedback
        isLoading={loading}
        isError={isError}
        error={error}
        isEmpty={!hasAnyData}
        loadingText="جارٍ تحميل التقارير..."
        errorTitle="تعذر تحميل تقارير الموارد البشرية"
        emptyTitle="لا توجد بيانات كافية لعرض التقرير."
      >
        <Card title="لوحة المؤشرات المختصرة" description="أهم أرقام HR في الفترة الحالية.">
          <div className="stats-grid">
            <button className="stat-card" type="button" onClick={() => setReportType('employees')} style={{ textAlign: 'right' }}><span>إجمالي الموظفين</span><strong>{employeesReport.total}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('employees')} style={{ textAlign: 'right' }}><span>ملفات ناقصة</span><strong>{employeesReport.missingBasics}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('attendance')} style={{ textAlign: 'right' }}><span>سجلات الحضور</span><strong>{attendanceReport.total}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('leaves')} style={{ textAlign: 'right' }}><span>طلبات الإجازة</span><strong>{leavesReport.total}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('loans')} style={{ textAlign: 'right' }}><span>سلف مفتوحة</span><strong>{loansReport.open}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('payroll')} style={{ textAlign: 'right' }}><span>صافي المرتبات</span><strong>{payrollReport.totalNet}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('assets')} style={{ textAlign: 'right' }}><span>عُهد تحتاج مراجعة</span><strong>{assetsReport.needsReview}</strong></button>
            <button className="stat-card" type="button" onClick={() => setReportType('alerts')} style={{ textAlign: 'right' }}><span>تنبيهات</span><strong>{alerts.length}</strong></button>
          </div>
        </Card>

        {showSection('employees') ? (
          <Card title="تقرير الموظفين" actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>فتح الموظفين</Button>}>
            <div className="stats-grid" style={{ marginBottom: 12 }}>
              <div className="stat-card"><span>إجمالي النتائج</span><strong>{employeesReport.total}</strong></div>
              <div className="stat-card"><span>نشط</span><strong>{employeesReport.active}</strong></div>
              <div className="stat-card"><span>غير نشط</span><strong>{employeesReport.inactive}</strong></div>
              <div className="stat-card"><span>بدون رقم قومي</span><strong>{employeesReport.missingNationalId}</strong></div>
              <div className="stat-card"><span>بدون قسم/مسمى</span><strong>{employeesReport.missingDepartmentOrTitle}</strong></div>
              <div className="stat-card"><span>دوام ناقص</span><strong>{employeesReport.missingWorkSchedule}</strong></div>
            </div>
            <DataTable
              density="compact"
              rowKey={(row) => String(row.id)}
              rows={filteredEmployees.slice(0, 40)}
              onRowClick={(row) => navigate(`/hr/employees/${row.id}`)}
              columns={[
                { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
                { key: 'name', header: 'اسم الموظف', cell: employeeName },
                { key: 'department', header: 'القسم', cell: (row) => text(row.departmentName) },
                { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => text(row.jobTitleName) },
                { key: 'nationalId', header: 'الرقم القومي', cell: (row) => normalize(row.nationalId) ? 'موجود' : 'غير مسجل' },
                { key: 'status', header: 'الحالة', cell: (row) => isActiveEmployee(row) ? 'نشط' : 'غير نشط' },
              ]}
            />
          </Card>
        ) : null}

        {showSection('attendance') ? (
          <Card title="تقرير الحضور" actions={<Button variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>}>
            <div className="stats-grid">
              <div className="stat-card"><span>إجمالي سجلات الفترة</span><strong>{attendanceReport.total}</strong></div>
              <div className="stat-card"><span>حاضر</span><strong>{attendanceReport.present}</strong></div>
              <div className="stat-card"><span>غائب</span><strong>{attendanceReport.absent}</strong></div>
              <div className="stat-card"><span>متأخر</span><strong>{attendanceReport.late}</strong></div>
              <div className="stat-card"><span>غير مسجل/يحتاج مراجعة</span><strong>{attendanceReport.needsReview}</strong></div>
            </div>
          </Card>
        ) : null}

        {showSection('leaves') ? (
          <Card title="تقرير الإجازات" actions={<Button variant="secondary" onClick={() => navigate('/hr/leaves')}>فتح الإجازات</Button>}>
            <div className="stats-grid">
              <div className="stat-card"><span>إجمالي الطلبات</span><strong>{leavesReport.total}</strong></div>
              <div className="stat-card"><span>قيد المراجعة</span><strong>{leavesReport.pending}</strong></div>
              <div className="stat-card"><span>معتمدة</span><strong>{leavesReport.approved}</strong></div>
              <div className="stat-card"><span>مرفوضة</span><strong>{leavesReport.rejected}</strong></div>
              <div className="stat-card"><span>غير مدفوعة/أيام</span><strong>{leavesReport.unpaid}</strong></div>
            </div>
          </Card>
        ) : null}

        {showSection('loans') ? (
          <Card title="تقرير السلف" actions={<Button variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف</Button>}>
            <div className="stats-grid">
              <div className="stat-card"><span>إجمالي السلف</span><strong>{loansReport.total}</strong></div>
              <div className="stat-card"><span>سلف مفتوحة</span><strong>{loansReport.open}</strong></div>
              <div className="stat-card"><span>أقساط مستحقة</span><strong>{loansReport.dueCount}</strong></div>
              <div className="stat-card"><span>مستحق هذا الشهر</span><strong>{money(loansReport.dueAmount)}</strong></div>
              <div className="stat-card"><span>إجمالي المتبقي</span><strong>{money(loansReport.remainingAmount)}</strong></div>
            </div>
          </Card>
        ) : null}

        {showSection('payroll') ? (
          <Card title="تقرير المرتبات" actions={<Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>}>
            <div className="stats-grid">
              <div className="stat-card"><span>عدد المسيرات</span><strong>{payrollReport.runs}</strong></div>
              <div className="stat-card"><span>حالة مسير الشهر</span><strong>{payrollReport.selectedRunStatus}</strong></div>
              <div className="stat-card"><span>موظفون في المسير</span><strong>{payrollReport.employeesInRun}</strong></div>
              <div className="stat-card"><span>إجمالي الأساسي</span><strong>{payrollReport.totalBase}</strong></div>
              <div className="stat-card"><span>إجمالي الخصومات</span><strong>{payrollReport.totalDeduction}</strong></div>
              <div className="stat-card"><span>إجمالي السلف/الأقساط</span><strong>{payrollReport.totalLoan}</strong></div>
              <div className="stat-card"><span>صافي المرتبات</span><strong>{payrollReport.totalNet}</strong></div>
              <div className="stat-card"><span>يحتاج مراجعة</span><strong>{payrollReport.needsReview}</strong></div>
            </div>
          </Card>
        ) : null}

        {showSection('assets') ? (
          <Card title="تقرير العُهد" actions={<Button variant="secondary" onClick={() => navigate('/hr/assets')}>فتح العُهد</Button>}>
            <div className="stats-grid">
              <div className="stat-card"><span>إجمالي العُهد</span><strong>{assetsReport.total}</strong></div>
              <div className="stat-card"><span>مسلّمة</span><strong>{assetsReport.assigned}</strong></div>
              <div className="stat-card"><span>مرتجعة</span><strong>{assetsReport.returned}</strong></div>
              <div className="stat-card"><span>تالفة</span><strong>{assetsReport.damaged}</strong></div>
              <div className="stat-card"><span>مفقودة</span><strong>{assetsReport.lost}</strong></div>
              <div className="stat-card"><span>مفتوحة</span><strong>{assetsReport.open}</strong></div>
              <div className="stat-card"><span>تحتاج مراجعة</span><strong>{assetsReport.needsReview}</strong></div>
            </div>
          </Card>
        ) : null}

        {showSection('alerts') ? (
          <Card title="تنبيهات تحتاج مراجعة" description="كل صف يوجهك للصفحة الصحيحة لمعالجة السبب.">
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
                  { key: 'action', header: 'الإجراء', cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }}>{row.action}</Button> },
                ]}
              />
            ) : <p className="muted">لا توجد تنبيهات ظاهرة حسب الفلاتر الحالية.</p>}
          </Card>
        ) : null}

        <Card title="ملاحظة تشغيلية">
          <p className="muted" style={{ margin: 0 }}>
            التقارير هنا للمراجعة والتوجيه السريع. قرارات الاعتماد النهائية تتم من الصفحات التشغيلية: الحضور، الإجازات، السلف، والمرتبات.
          </p>
        </Card>
      </QueryFeedback>
    </div>
  );
}
