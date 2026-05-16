import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrPayrollRun } from '@/types/domain';
import {
  useHrAttendance,
  useHrEmployeeAssets,
  useHrLeaveRequests,
  useHrReportsSummary,
  useHrWorkspace,
} from '@/features/hr/hooks/useHr';

type ReportType = 'all' | 'employees' | 'attendance' | 'leaves' | 'payroll' | 'alerts';

const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'employees', label: 'الموظفين' },
  { value: 'attendance', label: 'الحضور' },
  { value: 'leaves', label: 'الإجازات' },
  { value: 'payroll', label: 'المرتبات' },
  { value: 'alerts', label: 'التنبيهات' },
];

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'غير متاح';
  return `${amount.toFixed(2)} ج.م`;
}

function countText(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'غير متاح';
  return String(amount);
}

function text(value: unknown) {
  return String(value || '').trim() || '—';
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate() {
  return `${todayDate().slice(0, 7)}-01`;
}

function employeeMatches(employee: HrEmployee, search: string, department: string) {
  const searchTerm = normalize(search);
  const departmentName = normalize(employee.departmentName);

  if (department !== 'all' && departmentName !== department) return false;

  if (!searchTerm) return true;
  const haystack = [
    employee.displayName,
    employee.firstName,
    employee.lastName,
    employee.employeeNo,
    employee.nationalId,
    employee.departmentName,
    employee.jobTitleName,
  ].map((value) => normalize(value)).join(' ');

  return haystack.includes(searchTerm);
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
  const workspace = useHrWorkspace({ page: 1, pageSize: 200, search, month });
  const attendanceQuery = useHrAttendance({ from, to, page: 1, pageSize: 200, search });
  const leavesQuery = useHrLeaveRequests({ from, to, page: 1, pageSize: 200, search });
  const assetsQuery = useHrEmployeeAssets({ from, to, page: 1, pageSize: 200, search });

  const summary = summaryQuery.data?.summary;
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const payrollRuns = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);

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

  const employeesCompleteness = useMemo(() => {
    let missingNationalId = 0;
    let missingDepartmentOrTitle = 0;
    let missingMobile = 0;

    for (const employee of filteredEmployees) {
      const hasNationalId = Boolean(normalize(employee.nationalId));
      const hasDepartmentOrTitle = Boolean(normalize(employee.departmentName) || normalize(employee.jobTitleName));
      if (!hasNationalId) missingNationalId += 1;
      if (!hasDepartmentOrTitle) missingDepartmentOrTitle += 1;
    }

    const contacts = workspace.summary.data;
    if (!contacts) {
      missingMobile = Number.NaN;
    }

    return {
      total: filteredEmployees.length,
      active: filteredEmployees.filter((employee) => normalize(employee.status) === 'active').length,
      inactive: filteredEmployees.filter((employee) => normalize(employee.status) !== 'active').length,
      missingNationalId,
      missingDepartmentOrTitle,
      missingMobile,
    };
  }, [filteredEmployees, workspace.summary.data]);

  const attendanceSummary = useMemo(() => {
    const source = summary?.attendance;
    return {
      total: countText(attendanceQuery.data?.summary?.totalItems),
      present: countText(source?.presentCount),
      absent: countText(source?.absentCount),
      late: countText(source?.lateCount),
      needsReview: countText(attendanceQuery.data?.summary?.unmarkedCount),
    };
  }, [summary?.attendance, attendanceQuery.data?.summary?.totalItems, attendanceQuery.data?.summary?.unmarkedCount]);

  const leavesSummary = useMemo(() => {
    const source = summary?.leaves;
    return {
      total: countText(leavesQuery.data?.summary?.totalItems),
      pending: countText(source?.pendingCount),
      approved: countText(source?.approvedCount),
      rejected: countText(source?.rejectedCount),
      unpaidDays: countText(source?.unpaidLeaveDays),
    };
  }, [summary?.leaves, leavesQuery.data?.summary?.totalItems]);

  const payrollSummary = useMemo(() => {
    const source = summary?.payroll;
    const run = payrollRuns.find((item) => normalize(item.periodMonth) === normalize(month)) || payrollRuns[0];

    if (!run) {
      return {
        employeesInRun: 'غير متاح',
        totalBase: 'غير متاح',
        totalDeduction: 'غير متاح',
        totalLoan: 'غير متاح',
        totalNet: money(source?.totalNetPay),
        needsReview: 'غير متاح',
      };
    }

    const items = run.items || [];
    const needsReviewCount = items.filter((row) => {
      const unpaid = Number((row as { unpaidLeaveDays?: number }).unpaidLeaveDays || 0) > 0;
      const deduction = Number(row.deductionAmount || 0) > 0;
      const loan = Number(row.loanDeductionAmount || 0) > 0;
      const salaryMissing = Number(row.baseSalary || 0) <= 0;
      return unpaid || deduction || loan || salaryMissing;
    }).length;

    return {
      employeesInRun: countText(run.itemCount || items.length),
      totalBase: money(run.totalBaseSalary),
      totalDeduction: money(run.totalDeductionAmount),
      totalLoan: money(run.totalLoanDeductionAmount),
      totalNet: money(run.totalNetPay || source?.totalNetPay),
      needsReview: countText(needsReviewCount),
    };
  }, [summary?.payroll, payrollRuns, month]);

  const alerts = useMemo(() => {
    const rows: Array<{ id: string; type: string; employee: string; note: string }> = [];

    for (const employee of filteredEmployees) {
      if (!normalize(employee.nationalId)) {
        rows.push({
          id: `emp-national-${employee.id}`,
          type: 'بيانات موظف',
          employee: employee.displayName || employee.firstName,
          note: 'بدون رقم قومي.',
        });
      }
      if (!normalize(employee.departmentName) && !normalize(employee.jobTitleName)) {
        rows.push({
          id: `emp-role-${employee.id}`,
          type: 'بيانات موظف',
          employee: employee.displayName || employee.firstName,
          note: 'بدون قسم أو مسمى وظيفي.',
        });
      }
      if (Number(employee?.hireDate ? 1 : 0) === 0) {
        rows.push({
          id: `emp-hire-${employee.id}`,
          type: 'بيانات موظف',
          employee: employee.displayName || employee.firstName,
          note: 'تاريخ التعيين غير مسجل.',
        });
      }
    }

    for (const request of leavesQuery.data?.requests || []) {
      const reason = normalize((request as { leaveTypeName?: string }).leaveTypeName);
      if (reason.includes('بدون') || reason.includes('unpaid')) {
        rows.push({
          id: `leave-unpaid-${request.id}`,
          type: 'إجازات',
          employee: text(request.employeeName),
          note: 'إجازة غير مدفوعة قد تؤثر على المرتب.',
        });
      }
    }

    for (const run of payrollRuns) {
      if (normalize(run.status) === 'draft' || normalize(run.status) === 'reviewed') {
        rows.push({
          id: `payroll-${run.id}`,
          type: 'مرتبات',
          employee: text(run.periodMonth),
          note: 'مسير يحتاج مراجعة قبل الاعتماد النهائي.',
        });
      }
    }

    const unmarked = Number(attendanceQuery.data?.summary?.unmarkedCount || 0);
    if (unmarked > 0) {
      rows.push({
        id: 'attendance-unmarked',
        type: 'حضور',
        employee: 'سجلات اليوم',
        note: `يوجد ${unmarked} سجل حضور غير مكتمل ويحتاج مراجعة.`,
      });
    }

    return rows.slice(0, 60);
  }, [filteredEmployees, leavesQuery.data?.requests, payrollRuns, attendanceQuery.data?.summary?.unmarkedCount]);

  const hasAnyData = useMemo(() => {
    return (
      filteredEmployees.length > 0
      || Number(summary?.employeeCount || 0) > 0
      || Number(summary?.attendance?.presentCount || 0) > 0
      || Number(summary?.leaves?.approvedCount || 0) > 0
      || Number(summary?.assets?.assignedCount || 0) > 0
      || Number(summary?.payroll?.runCount || 0) > 0
    );
  }, [filteredEmployees.length, summary]);

  const loading = summaryQuery.isLoading || workspace.employees.isLoading || attendanceQuery.isLoading || leavesQuery.isLoading || assetsQuery.isLoading;
  const isError = summaryQuery.isError || workspace.employees.isError || attendanceQuery.isError || leavesQuery.isError || assetsQuery.isError;
  const error = summaryQuery.error || workspace.employees.error || attendanceQuery.error || leavesQuery.error || assetsQuery.error;

  const showSection = (type: ReportType) => reportType === 'all' || reportType === type;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="تقارير الموارد البشرية"
        description="ملخص تشغيلي لحالة الموارد البشرية ونقاط المراجعة خلال الفترة المحددة."
        actions={<Button variant="secondary" onClick={() => navigate('/hr')}>رجوع للموارد البشرية</Button>}
      />

      <Card title="الفترة والفلاتر">
        <div className="form-grid">
          <label className="field">
            <span>من تاريخ</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>إلى تاريخ</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="field">
            <span>الشهر</span>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <label className="field">
            <span>السنة</span>
            <input readOnly value={month.split('-')[0] || ''} />
          </label>
          <label className="field field-wide">
            <span>بحث الموظف (اسم/كود)</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اكتب اسم الموظف أو كوده" />
          </label>
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
        <div className="stats-grid">
          <Card title="إجمالي الموظفين"><strong>{countText(summary?.employeeCount)}</strong></Card>
          <Card title="الموظفون النشطون"><strong>{countText(summary?.activeEmployeeCount)}</strong></Card>
          <Card title="سجلات الحضور"><strong>{attendanceSummary.total}</strong></Card>
          <Card title="طلبات الإجازات"><strong>{leavesSummary.total}</strong></Card>
          <Card title="صافي المرتبات"><strong>{money(summary?.payroll?.totalNetPay)}</strong></Card>
          <Card title="عناصر تحتاج مراجعة"><strong>{countText(alerts.length)}</strong></Card>
        </div>

        {showSection('employees') ? (
          <Card title="تقرير الموظفين">
            <div className="stats-grid" style={{ marginBottom: 12 }}>
              <div><strong>إجمالي الموظفين:</strong> {employeesCompleteness.total}</div>
              <div><strong>نشط:</strong> {employeesCompleteness.active}</div>
              <div><strong>غير نشط:</strong> {employeesCompleteness.inactive}</div>
              <div><strong>بدون رقم قومي:</strong> {employeesCompleteness.missingNationalId}</div>
              <div><strong>بدون قسم/مسمى وظيفي:</strong> {employeesCompleteness.missingDepartmentOrTitle}</div>
              <div><strong>بدون موبايل:</strong> غير متاح</div>
            </div>
            <DataTable
              density="compact"
              rowKey={(row) => String((row as HrEmployee).id)}
              rows={filteredEmployees.slice(0, 30)}
              columns={[
                { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text((row as HrEmployee).employeeNo) },
                { key: 'name', header: 'اسم الموظف', cell: (row) => text((row as HrEmployee).displayName || (row as HrEmployee).firstName) },
                { key: 'department', header: 'القسم', cell: (row) => text((row as HrEmployee).departmentName) },
                { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => text((row as HrEmployee).jobTitleName) },
                { key: 'nationalId', header: 'الرقم القومي', cell: (row) => normalize((row as HrEmployee).nationalId) ? 'موجود' : 'غير مسجل' },
                { key: 'status', header: 'الحالة', cell: (row) => text((row as HrEmployee).status) },
              ]}
            />
          </Card>
        ) : null}

        {showSection('attendance') ? (
          <Card title="تقرير الحضور">
            <div className="stats-grid">
              <div><strong>إجمالي سجلات الفترة:</strong> {attendanceSummary.total}</div>
              <div><strong>حاضر:</strong> {attendanceSummary.present}</div>
              <div><strong>غائب:</strong> {attendanceSummary.absent}</div>
              <div><strong>متأخر:</strong> {attendanceSummary.late}</div>
              <div><strong>غير مسجل/يحتاج مراجعة:</strong> {attendanceSummary.needsReview}</div>
            </div>
          </Card>
        ) : null}

        {showSection('leaves') ? (
          <Card title="تقرير الإجازات">
            <div className="stats-grid">
              <div><strong>إجمالي الطلبات:</strong> {leavesSummary.total}</div>
              <div><strong>قيد المراجعة:</strong> {leavesSummary.pending}</div>
              <div><strong>معتمدة:</strong> {leavesSummary.approved}</div>
              <div><strong>مرفوضة:</strong> {leavesSummary.rejected}</div>
              <div><strong>إجازات غير مدفوعة:</strong> {leavesSummary.unpaidDays}</div>
            </div>
          </Card>
        ) : null}

        {showSection('payroll') ? (
          <Card title="تقرير المرتبات">
            <div className="stats-grid">
              <div><strong>إجمالي الموظفين في المسير:</strong> {payrollSummary.employeesInRun}</div>
              <div><strong>إجمالي الأساسي:</strong> {payrollSummary.totalBase}</div>
              <div><strong>إجمالي الخصومات:</strong> {payrollSummary.totalDeduction}</div>
              <div><strong>إجمالي السلف/الأقساط:</strong> {payrollSummary.totalLoan}</div>
              <div><strong>صافي المرتبات:</strong> {payrollSummary.totalNet}</div>
              <div><strong>يحتاج مراجعة:</strong> {payrollSummary.needsReview}</div>
            </div>
          </Card>
        ) : null}

        {showSection('alerts') ? (
          <Card title="تنبيهات تحتاج مراجعة">
            {alerts.length ? (
              <DataTable
                density="compact"
                rows={alerts}
                rowKey={(row) => String((row as { id: string }).id)}
                columns={[
                  { key: 'type', header: 'النوع', cell: (row) => text((row as { type: string }).type) },
                  { key: 'employee', header: 'الموظف/الفترة', cell: (row) => text((row as { employee: string }).employee) },
                  { key: 'note', header: 'التنبيه', cell: (row) => text((row as { note: string }).note) },
                ]}
              />
            ) : (
              <p className="muted">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
            )}
          </Card>
        ) : null}

        <Card title="ملاحظة">
          <p className="muted" style={{ margin: 0 }}>
            بعض المؤشرات تحتاج ربط بيانات إضافية لاحقًا.
          </p>
        </Card>
      </QueryFeedback>
    </div>
  );
}
