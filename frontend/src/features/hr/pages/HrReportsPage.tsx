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
        employeesInRun: 'ط؛ظٹط± ظ…طھط§ط­',
        totalBase: 'ط؛ظٹط± ظ…طھط§ط­',
        totalDeduction: 'ط؛ظٹط± ظ…طھط§ط­',
        totalLoan: 'ط؛ظٹط± ظ…طھط§ط­',
        totalNet: money(source?.totalNetPay),
        needsReview: 'ط؛ظٹط± ظ…طھط§ط­',
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
          type: 'ط¨ظٹط§ظ†ط§طھ ظ…ظˆط¸ظپ',
          employee: employee.displayName || employee.firstName,
          note: 'ط¨ط¯ظˆظ† ط±ظ‚ظ… ظ‚ظˆظ…ظٹ.',
        });
      }
      if (!normalize(employee.departmentName) && !normalize(employee.jobTitleName)) {
        rows.push({
          id: `emp-role-${employee.id}`,
          type: 'ط¨ظٹط§ظ†ط§طھ ظ…ظˆط¸ظپ',
          employee: employee.displayName || employee.firstName,
          note: 'ط¨ط¯ظˆظ† ظ‚ط³ظ… ط£ظˆ ظ…ط³ظ…ظ‰ ظˆط¸ظٹظپظٹ.',
        });
      }
      if (Number(employee?.hireDate ? 1 : 0) === 0) {
        rows.push({
          id: `emp-hire-${employee.id}`,
          type: 'ط¨ظٹط§ظ†ط§طھ ظ…ظˆط¸ظپ',
          employee: employee.displayName || employee.firstName,
          note: 'طھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ† ط؛ظٹط± ظ…ط³ط¬ظ„.',
        });
      }
    }

    for (const request of leavesQuery.data?.requests || []) {
      const reason = normalize((request as { leaveTypeName?: string }).leaveTypeName);
      if (reason.includes('ط¨ط¯ظˆظ†') || reason.includes('unpaid')) {
        rows.push({
          id: `leave-unpaid-${request.id}`,
          type: 'ط¥ط¬ط§ط²ط§طھ',
          employee: text(request.employeeName),
          note: 'ط¥ط¬ط§ط²ط© ط؛ظٹط± ظ…ط¯ظپظˆط¹ط© ظ‚ط¯ طھط¤ط«ط± ط¹ظ„ظ‰ ط§ظ„ط±ط§طھط¨.',
        });
      }
    }

    for (const run of payrollRuns) {
      if (normalize(run.status) === 'draft' || normalize(run.status) === 'reviewed') {
        rows.push({
          id: `payroll-${run.id}`,
          type: 'ظ…ط±طھط¨ط§طھ',
          employee: text(run.periodMonth),
          note: 'ظ…ط³ظٹط± ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ظ‡ط§ط¦ظٹ.',
        });
      }
    }

    const unmarked = Number(attendanceQuery.data?.summary?.unmarkedCount || 0);
    if (unmarked > 0) {
      rows.push({
        id: 'attendance-unmarked',
        type: 'ط­ط¶ظˆط±',
        employee: 'ط³ط¬ظ„ط§طھ ط§ظ„ظٹظˆظ…',
        note: `ظٹظˆط¬ط¯ ${unmarked} ط³ط¬ظ„ ط­ط¶ظˆط± ط؛ظٹط± ظ…ظƒطھظ…ظ„ ظˆظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©.`,
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
        title="طھظ‚ط§ط±ظٹط± ط§ظ„ظ…ظˆط§ط±ط¯ ط§ظ„ط¨ط´ط±ظٹط©"
        description="ظ…ظ„ط®طµ طھط´ط؛ظٹظ„ظٹ ظ„ط­ط§ظ„ط© ط§ظ„ظ…ظˆط§ط±ط¯ ط§ظ„ط¨ط´ط±ظٹط© ظˆظ†ظ‚ط§ط· ط§ظ„ظ…ط±ط§ط¬ط¹ط© ط®ظ„ط§ظ„ ط§ظ„ظپطھط±ط© ط§ظ„ظ…ط­ط¯ط¯ط©."
        actions={<Button variant="secondary" onClick={() => navigate('/hr')}>ط±ط¬ظˆط¹ ظ„ظ„ظ…ظˆط§ط±ط¯ ط§ظ„ط¨ط´ط±ظٹط©</Button>}
      />

      <Card title="ط§ظ„ظپطھط±ط© ظˆط§ظ„ظپظ„ط§طھط±">
        <div className="form-grid">
          <label className="field">
            <span>ظ…ظ† طھط§ط±ظٹط®</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>ط¥ظ„ظ‰ طھط§ط±ظٹط®</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="field">
            <span>ط§ظ„ط´ظ‡ط±</span>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <label className="field">
            <span>ط§ظ„ط³ظ†ط©</span>
            <input readOnly value={month.split('-')[0] || ''} />
          </label>
          <label className="field field-wide">
            <span>ط¨ط­ط« ط§ظ„ظ…ظˆط¸ظپ (ط§ط³ظ…/ظƒظˆط¯)</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ ط£ظˆ ظƒظˆط¯ظ‡" />
          </label>
          <label className="field">
            <span>ط§ظ„ظ‚ط³ظ…</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="all">ط§ظ„ظƒظ„</option>
              {departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>ظ†ظˆط¹ ط§ظ„طھظ‚ط±ظٹط±</span>
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
        loadingText="ط¬ط§ط±ظچ طھط­ظ…ظٹظ„ ط§ظ„طھظ‚ط§ط±ظٹط±..."
        errorTitle="طھط¹ط°ط± طھط­ظ…ظٹظ„ طھظ‚ط§ط±ظٹط± ط§ظ„ظ…ظˆط§ط±ط¯ ط§ظ„ط¨ط´ط±ظٹط©"
        emptyTitle="ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظƒط§ظپظٹط© ظ„ط¹ط±ط¶ ط§ظ„طھظ‚ط±ظٹط±."
      >
        <div className="stats-grid">
          <Card title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظˆط¸ظپظٹظ†"><strong>{countText(summary?.employeeCount)}</strong></Card>
          <Card title="ط§ظ„ظ…ظˆط¸ظپظˆظ† ط§ظ„ظ†ط´ط·ظˆظ†"><strong>{countText(summary?.activeEmployeeCount)}</strong></Card>
          <Card title="ط³ط¬ظ„ط§طھ ط§ظ„ط­ط¶ظˆط±"><strong>{attendanceSummary.total}</strong></Card>
          <Card title="ط·ظ„ط¨ط§طھ ط§ظ„ط¥ط¬ط§ط²ط§طھ"><strong>{leavesSummary.total}</strong></Card>
          <Card title="طµط§ظپظٹ ط§ظ„ظ…ط±طھط¨ط§طھ"><strong>{money(summary?.payroll?.totalNetPay)}</strong></Card>
          <Card title="ط¹ظ†ط§طµط± طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©"><strong>{countText(alerts.length)}</strong></Card>
        </div>

        {showSection('employees') ? (
          <Card title="طھظ‚ط±ظٹط± ط§ظ„ظ…ظˆط¸ظپظٹظ†">
            <div className="stats-grid" style={{ marginBottom: 12 }}>
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظˆط¸ظپظٹظ†:</strong> {employeesCompleteness.total}</div>
              <div><strong>ظ†ط´ط·:</strong> {employeesCompleteness.active}</div>
              <div><strong>ط؛ظٹط± ظ†ط´ط·:</strong> {employeesCompleteness.inactive}</div>
              <div><strong>ط¨ط¯ظˆظ† ط±ظ‚ظ… ظ‚ظˆظ…ظٹ:</strong> {employeesCompleteness.missingNationalId}</div>
              <div><strong>ط¨ط¯ظˆظ† ظ‚ط³ظ…/ظ…ط³ظ…ظ‰ ظˆط¸ظٹظپظٹ:</strong> {employeesCompleteness.missingDepartmentOrTitle}</div>
              <div><strong>ط¨ط¯ظˆظ† ظ…ظˆط¨ط§ظٹظ„:</strong> ط؛ظٹط± ظ…طھط§ط­</div>
            </div>
            <DataTable
              density="compact"
              rowKey={(row) => String((row as HrEmployee).id)}
              rows={filteredEmployees.slice(0, 30)}
              columns={[
                { key: 'employeeNo', header: 'ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => text((row as HrEmployee).employeeNo) },
                { key: 'name', header: 'ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => text((row as HrEmployee).displayName || (row as HrEmployee).firstName) },
                { key: 'department', header: 'ط§ظ„ظ‚ط³ظ…', cell: (row) => text((row as HrEmployee).departmentName) },
                { key: 'jobTitle', header: 'ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ', cell: (row) => text((row as HrEmployee).jobTitleName) },
                { key: 'nationalId', header: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ', cell: (row) => normalize((row as HrEmployee).nationalId) ? 'ظ…ظˆط¬ظˆط¯' : 'ط؛ظٹط± ظ…ط³ط¬ظ„' },
                { key: 'status', header: 'ط§ظ„ط­ط§ظ„ط©', cell: (row) => text((row as HrEmployee).status) },
              ]}
            />
          </Card>
        ) : null}

        {showSection('attendance') ? (
          <Card title="طھظ‚ط±ظٹط± ط§ظ„ط­ط¶ظˆط±">
            <div className="stats-grid">
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط³ط¬ظ„ط§طھ ط§ظ„ظپطھط±ط©:</strong> {attendanceSummary.total}</div>
              <div><strong>ط­ط§ط¶ط±:</strong> {attendanceSummary.present}</div>
              <div><strong>ط؛ط§ط¦ط¨:</strong> {attendanceSummary.absent}</div>
              <div><strong>ظ…طھط£ط®ط±:</strong> {attendanceSummary.late}</div>
              <div><strong>ط؛ظٹط± ظ…ط³ط¬ظ„/ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©:</strong> {attendanceSummary.needsReview}</div>
            </div>
          </Card>
        ) : null}

        {showSection('leaves') ? (
          <Card title="طھظ‚ط±ظٹط± ط§ظ„ط¥ط¬ط§ط²ط§طھ">
            <div className="stats-grid">
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط·ظ„ط¨ط§طھ:</strong> {leavesSummary.total}</div>
              <div><strong>ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©:</strong> {leavesSummary.pending}</div>
              <div><strong>ظ…ط¹طھظ…ط¯ط©:</strong> {leavesSummary.approved}</div>
              <div><strong>ظ…ط±ظپظˆط¶ط©:</strong> {leavesSummary.rejected}</div>
              <div><strong>ط¥ط¬ط§ط²ط§طھ ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©:</strong> {leavesSummary.unpaidDays}</div>
            </div>
          </Card>
        ) : null}

        {showSection('payroll') ? (
          <Card title="طھظ‚ط±ظٹط± ط§ظ„ظ…ط±طھط¨ط§طھ">
            <div className="stats-grid">
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظˆط¸ظپظٹظ† ظپظٹ ط§ظ„ظ…ط³ظٹط±:</strong> {payrollSummary.employeesInRun}</div>
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£ط³ط§ط³ظٹ:</strong> {payrollSummary.totalBase}</div>
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط®طµظˆظ…ط§طھ:</strong> {payrollSummary.totalDeduction}</div>
              <div><strong>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ظ„ظپ/ط§ظ„ط£ظ‚ط³ط§ط·:</strong> {payrollSummary.totalLoan}</div>
              <div><strong>طµط§ظپظٹ ط§ظ„ظ…ط±طھط¨ط§طھ:</strong> {payrollSummary.totalNet}</div>
              <div><strong>ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©:</strong> {payrollSummary.needsReview}</div>
            </div>
          </Card>
        ) : null}

        {showSection('alerts') ? (
          <Card title="طھظ†ط¨ظٹظ‡ط§طھ طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©">
            {alerts.length ? (
              <DataTable
                density="compact"
                rows={alerts}
                rowKey={(row) => String((row as { id: string }).id)}
                columns={[
                  { key: 'type', header: 'ط§ظ„ظ†ظˆط¹', cell: (row) => text((row as { type: string }).type) },
                  { key: 'employee', header: 'ط§ظ„ظ…ظˆط¸ظپ/ط§ظ„ظپطھط±ط©', cell: (row) => text((row as { employee: string }).employee) },
                  { key: 'note', header: 'ط§ظ„طھظ†ط¨ظٹظ‡', cell: (row) => text((row as { note: string }).note) },
                ]}
              />
            ) : (
              <p className="muted">ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط© ظ„ظ„ظپظ„ط§طھط± ط§ظ„ط­ط§ظ„ظٹط©.</p>
            )}
          </Card>
        ) : null}

        <Card title="ظ…ظ„ط§ط­ط¸ط©">
          <p className="muted" style={{ margin: 0 }}>
            ط¨ط¹ط¶ ط§ظ„ظ…ط¤ط´ط±ط§طھ طھط­طھط§ط¬ ط±ط¨ط· ط¨ظٹط§ظ†ط§طھ ط¥ط¶ط§ظپظٹط© ظ„ط§ط­ظ‚ظ‹ط§.
          </p>
        </Card>
      </QueryFeedback>
    </div>
  );
}


