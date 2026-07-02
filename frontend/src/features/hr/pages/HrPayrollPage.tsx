import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrPayrollRun, HrPayrollRunItem } from '@/types/domain';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrPayrollRun, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrPayrollTopSections } from '@/features/hr/pages/payroll/HrPayrollTopSections';
import { printHtmlDocument } from '@/lib/browser/print';
import { renderToString } from 'react-dom/server';
import { PayslipPrintView } from '@/features/hr/components/PayslipPrintView';
import { HrPayrollOperationalNote, HrPayrollWorkflowCard } from '@/features/hr/pages/payroll/HrPayrollStaticCards';
import {
  employeeMatches,
  itemNeedsReview,
  money,
  normalize,
  reviewAttendanceText,
  reviewFlagText,
  reviewLeavesText,
  statusLabel,
  text,
  type PayrollReviewStatus,
} from '@/features/hr/pages/payroll/hr-payroll.helpers';

interface PayrollDraft {
  periodMonth: string;
  notes: string;
}

const initialDraft: PayrollDraft = {
  periodMonth: '',
  notes: '',
};

export function HrPayrollPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const canViewPayroll = useHasAnyPermission(['hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);
  const canManagePayroll = useHasAnyPermission(['hrPayrollManage', 'hrPayrollApprove']);
  const canApprovePayroll = useHasAnyPermission('hrPayrollApprove');
  const canViewSalaryAmounts = useHasAnyPermission(['hrSalaryView', 'hrSalaryManage', 'hrPayrollManage', 'hrPayrollApprove']);

  const now = new Date();
  const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<PayrollReviewStatus>('all');
  const [draft, setDraft] = useState<PayrollDraft>(initialDraft);
  const [formError, setFormError] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');

  const workspace = useHrWorkspace({ page, pageSize, month: monthFilter });
  const payrollRunDetails = useHrPayrollRun(selectedRunId || undefined);

  const runs = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const employeesMap = useMemo(() => new Map(employees.map((employee) => [String(employee.id), employee])), [employees]);

  const totalItems = Number(workspace.payrollRuns.data?.summary?.totalItems || runs.length || 0);
  const selectedRunFromList = useMemo(() => runs.find((row) => String(row.id) === String(selectedRunId)), [runs, selectedRunId]);
  const selectedRun = (payrollRunDetails.data?.run || selectedRunFromList) as HrPayrollRun | undefined;
  const runItems = useMemo(() => (selectedRun?.items || []) as HrPayrollRunItem[], [selectedRun?.items]);

  const departmentOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (!key) continue;
      set.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(set.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [employees]);

  const filteredRunItems = useMemo(() => {
    const searchTerm = normalize(search);
    return runItems.filter((row) => {
      if (!employeeMatches(row, employeesMap, searchTerm, departmentFilter)) return false;
      const rowStatus = normalize(row.status);
      const needsReview = itemNeedsReview(row);
      if (reviewStatusFilter === 'all') return true;
      if (reviewStatusFilter === 'needs_review') return needsReview;
      if (reviewStatusFilter === 'ready') return rowStatus === 'reviewed' || (rowStatus === 'draft' && !needsReview);
      if (reviewStatusFilter === 'approved') return rowStatus === 'approved';
      if (reviewStatusFilter === 'paid') return rowStatus === 'paid';
      return true;
    });
  }, [runItems, search, employeesMap, departmentFilter, reviewStatusFilter]);

  const summary = useMemo(() => {
    const rows = filteredRunItems;
    const totalEmployees = rows.length;
    const totalBaseSalary = rows.reduce((sum, row) => sum + Number(row.baseSalary || 0), 0);
    const totalDeductions = rows.reduce((sum, row) => sum + Number(row.deductionAmount || 0), 0);
    const totalLoanDeduction = rows.reduce((sum, row) => sum + Number(row.loanDeductionAmount || 0), 0);
    const totalNet = rows.reduce((sum, row) => sum + Number(row.netPay || 0), 0);
    const needsReview = rows.filter(itemNeedsReview).length;
    return { totalEmployees, totalBaseSalary, totalDeductions, totalLoanDeduction, totalNet, needsReview };
  }, [filteredRunItems]);

  const dueLoanInstallmentRows = useMemo(
    () => filteredRunItems.filter((row) => Number(row.loanDeductionAmount || 0) > 0),
    [filteredRunItems],
  );

  const runStatusOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const row of runs) {
      const value = normalize(row.status);
      if (!value) continue;
      labels.set(value, statusLabel(value));
    }
    return Array.from(labels.entries()).map(([value, label]) => ({ value, label }));
  }, [runs]);

  const [runStatusFilter, setRunStatusFilter] = useState('all');
  const filteredRuns = useMemo(() => {
    if (runStatusFilter === 'all') return runs;
    return runs.filter((row) => normalize(row.status) === runStatusFilter);
  }, [runs, runStatusFilter]);

  const hasCreatePayrollRun = Boolean(mutations.createPayrollRun);
  const selectedRunStatus = normalize(selectedRun?.status);
  const runIsFinal = selectedRunStatus === 'approved' || selectedRunStatus === 'paid';
  const payrollChecklist = useMemo(() => {
    const hasRun = Boolean(selectedRun);
    const hasItems = filteredRunItems.length > 0;
    return [
      { key: 'run', title: 'ط§ط®طھظٹط§ط± ظƒط´ظپ ط§ظ„ظ…ط±طھط¨ط§طھ', status: hasRun ? `طھظ… ط§ط®طھظٹط§ط± ظƒط´ظپ ${text(selectedRun?.periodMonth)}` : 'ط§ط®طھط± ظƒط´ظپظ‹ط§ ظ…ظ† ط¬ط¯ظˆظ„ ظƒط´ظˆظپ ط§ظ„ظ…ط±طھط¨ط§طھ ط£ظˆظ„ظ‹ط§.', ok: hasRun, action: 'ط§ط®طھظٹط§ط± ظƒط´ظپ', onClick: undefined },
      { key: 'items', title: 'ظˆط¬ظˆط¯ ظ…ظˆط¸ظپظٹظ† ط¯ط§ط®ظ„ ط§ظ„ظƒط´ظپ', status: hasItems ? `${filteredRunItems.length} ظ…ظˆط¸ظپ ط¸ط§ظ‡ط± ط­ط³ط¨ ط§ظ„ظپظ„ط§طھط± ط§ظ„ط­ط§ظ„ظٹط©.` : 'ظ„ط§ طھظˆط¬ط¯ ط¨ظ†ظˆط¯ ظ…ظˆط¸ظپظٹظ† ط¸ط§ظ‡ط±ط©. ط±ط§ط¬ط¹ ط§ظ„ظپظ„ط§طھط± ط£ظˆ ط£ظ†ط´ط¦ ط§ظ„ظ…ط³ظٹط±.', ok: hasItems, action: 'ظ…ط³ط­ ظپظ„ط§طھط± ط§ظ„ظ…ط±ط§ط¬ط¹ط©', onClick: () => { setSearch(''); setDepartmentFilter('all'); setReviewStatusFilter('all'); } },
      { key: 'review', title: 'ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط¥ط¬ط§ط²ط§طھ', status: summary.needsReview > 0 ? `${summary.needsReview} ظ…ظˆط¸ظپ ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯.` : 'ظ„ط§ طھظˆط¬ط¯ طھظ†ط¨ظٹظ‡ط§طھ ظ…ط±ط§ط¬ط¹ط© ط¸ط§ظ‡ط±ط© ظپظٹ ط§ظ„ظپظ„طھط± ط§ظ„ط­ط§ظ„ظٹ.', ok: summary.needsReview === 0, action: summary.needsReview > 0 ? 'ط¹ط±ط¶ ط§ظ„ظ…ط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©' : 'ظپطھط­ ط§ظ„ط­ط¶ظˆط±', onClick: summary.needsReview > 0 ? () => setReviewStatusFilter('needs_review') : () => navigate('/hr/attendance') },
      { key: 'loans', title: 'ط£ظ‚ط³ط§ط· ط§ظ„ط³ظ„ظپ ظ„ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±', status: dueLoanInstallmentRows.length > 0 ? `${dueLoanInstallmentRows.length} ظ…ظˆط¸ظپ ظ„ط¯ظٹظ‡ظ… ط®طµظ… ط³ظ„ظپط©/ظ‚ط³ط· ط¯ط§ط®ظ„ ط§ظ„ظƒط´ظپ.` : 'ظ„ط§ طھظˆط¬ط¯ ط£ظ‚ط³ط§ط· ط³ظ„ظپ ط¸ط§ظ‡ط±ط© ط¯ط§ط®ظ„ ط§ظ„ظƒط´ظپ ط§ظ„ط­ط§ظ„ظٹ.', ok: true, action: 'ظپطھط­ ط§ظ„ط³ظ„ظپ', onClick: () => navigate('/hr/loans') },
      { key: 'status', title: 'ط­ط§ظ„ط© ط§ظ„ط§ط¹طھظ…ط§ط¯', status: runIsFinal ? 'ط§ظ„ظƒط´ظپ ظ…ط¹طھظ…ط¯/ظ…طµط±ظˆظپ. ط£ظٹ طھط¹ط¯ظٹظ„ ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ط¥ط¯ط§ط±ظٹط©.' : 'ط§ظ„ظƒط´ظپ ظ…ط§ ط²ط§ظ„ ظ‚ط§ط¨ظ„ظ‹ط§ ظ„ظ„ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ظ‡ط§ط¦ظٹ.', ok: runIsFinal || summary.needsReview === 0, action: 'ظپطھط­ طھظپط§طµظٹظ„ ط§ظ„ظƒط´ظپ', onClick: undefined },
    ];
  }, [dueLoanInstallmentRows.length, filteredRunItems.length, navigate, runIsFinal, selectedRun, summary.needsReview]);

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const periodMonth = String(draft.periodMonth || '').trim();
    if (!periodMonth) { setFormError('ط´ظ‡ط± ظ…ط³ظٹط± ط§ظ„ظ…ط±طھط¨ط§طھ ظ…ط·ظ„ظˆط¨.'); return; }
    try {
      await mutations.createPayrollRun.mutateAsync({ periodMonth, notes: String(draft.notes || '').trim() || undefined });
      setDraft(initialDraft);
    } catch (error) {
      setFormError(getErrorMessage(error, 'طھط¹ط°ط± طھط¬ظ‡ظٹط² ظ…ط³ظٹط± ط§ظ„ظ…ط±طھط¨ط§طھ.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="ط§ظ„ظ…ط±طھط¨ط§طھ"
        description="ظ…ط³ط§ط± ط´ظ‡ط±ظٹ ظˆط§ط¶ط­: ط¬ظ‡ظ‘ط² ط§ظ„ظ…ط³ظٹط±طŒ ط±ط§ط¬ط¹ ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط¥ط¬ط§ط²ط§طھ ظˆط§ظ„ط³ظ„ظپطŒ ط«ظ… ط§ط¹طھظ…ط¯ ط¹ظ†ط¯ ط§ظƒطھظ…ط§ظ„ ط§ظ„ظ…ط±ط§ط¬ط¹ط©."
        actions={
          <div className="actions compact-actions">
            {hasCreatePayrollRun && canManagePayroll ? <Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, periodMonth: current.periodMonth || monthFilter }))}>ط¥ظ†ط´ط§ط، ظ…ط³ظٹط± ط§ظ„ط´ظ‡ط±</Button> : null}
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط­ط¶ظˆط±</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>ط±ط¬ظˆط¹ ظ„ظ„ظ…ظˆط¸ظپظٹظ†</Button>
          </div>
        }
      />

      {!canViewPayroll ? (
        <FormSection title="ط§ظ„ظˆطµظˆظ„ ظ„ظ„ظ…ط±طھط¨ط§طھ">
          <p className="muted" style={{ margin: 0 }}>ظ„ظٹط³ ظ„ط¯ظٹظƒ طµظ„ط§ط­ظٹط© ظ„ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ظ‡ط°ظ‡ ط§ظ„طµظپط­ط©.</p>
          <p className="muted" style={{ marginBottom: 0 }}>طھظˆط§طµظ„ ظ…ط¹ ظ…ط³ط¤ظˆظ„ ط§ظ„ظ†ط¸ط§ظ… ظ„طھط­ط¯ظٹط« ط§ظ„طµظ„ط§ط­ظٹط§طھ.</p>
        </FormSection>
      ) : (
        <>
          <HrPayrollWorkflowCard />
          <HrPayrollTopSections
            monthFilter={monthFilter}
            search={search}
            departmentFilter={departmentFilter}
            reviewStatusFilter={reviewStatusFilter}
            runStatusFilter={runStatusFilter}
            departmentOptions={departmentOptions}
            runStatusOptions={runStatusOptions}
            summary={summary}
            canViewSalaryAmounts={canViewSalaryAmounts}
            dueLoanInstallmentRows={dueLoanInstallmentRows}
            draft={draft}
            formError={formError}
            canManagePayroll={canManagePayroll}
            hasCreatePayrollRun={hasCreatePayrollRun}
            isCreatePending={mutations.createPayrollRun.isPending}
            onMonthFilterChange={(value) => { setMonthFilter(value); setPage(1); }}
            onSearchChange={setSearch}
            onDepartmentFilterChange={setDepartmentFilter}
            onReviewStatusFilterChange={setReviewStatusFilter}
            onRunStatusFilterChange={setRunStatusFilter}
            onDraftChange={setDraft}
            onCreateRun={(event) => { void handleCreateRun(event); }}
          />

          <FormSection title="ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯" description="ظ‚ط§ط¦ظ…ط© ظ…ط®طھطµط±ط© طھظ…ظ†ط¹ ظ†ط³ظٹط§ظ† ط§ظ„ط­ط¶ظˆط± ط£ظˆ ط§ظ„ط³ظ„ظپ ط£ظˆ ط§ظ„ط¨ظ†ظˆط¯ ط§ظ„طھظٹ طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ…ط±طھط¨ط§طھ.">
            <div className="form-grid">
              {payrollChecklist.map((item) => (
                <div key={item.key} className="field" style={{ alignItems: 'flex-start' }}>
                  <strong>{item.ok ? 'âœ“' : 'â€¢'} {item.title}</strong>
                  <span className="muted">{item.status}</span>
                  {item.onClick ? <Button type="button" variant="secondary" onClick={item.onClick}>{item.action}</Button> : null}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="ظƒط´ظˆظپ ط§ظ„ظ…ط±طھط¨ط§طھ ط§ظ„ط´ظ‡ط±ظٹط©">
            <QueryFeedback isLoading={workspace.payrollRuns.isLoading} isError={workspace.payrollRuns.isError} error={workspace.payrollRuns.error} isEmpty={!filteredRuns.length} loadingText="ط¬ط§ط±ظچ طھط­ظ…ظٹظ„ ظƒط´ظˆظپ ط§ظ„ظ…ط±طھط¨ط§طھ..." errorTitle="طھط¹ط°ط± طھط­ظ…ظٹظ„ ظƒط´ظˆظپ ط§ظ„ظ…ط±طھط¨ط§طھ" emptyTitle="ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط±طھط¨ط§طھ ظ„ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©.">
              <DataTable
                rows={filteredRuns}
                rowKey={(row) => String(row.id)}
                onRowClick={(row) => setSelectedRunId(String(row.id))}
                density="compact"
                pagination={{ page, pageSize, totalItems, onPageChange: setPage, onPageSizeChange: (next) => { setPageSize(next); setPage(1); }, itemLabel: 'ظƒط´ظپ' }}
                columns={[
                  { key: 'periodMonth', header: 'ط§ظ„ط´ظ‡ط±', cell: (row) => text(row.periodMonth) },
                  { key: 'status', header: 'ط§ظ„ط­ط§ظ„ط©', cell: (row) => statusLabel(row.status) },
                  { key: 'itemCount', header: 'ط¹ط¯ط¯ ط§ظ„ظ…ظˆط¸ظپظٹظ†', cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
                  { key: 'totalBaseSalary', header: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£ط³ط§ط³ظٹ', cell: (row) => canViewSalaryAmounts ? money(row.totalBaseSalary) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                  { key: 'totalDeductionAmount', header: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط®طµظˆظ…ط§طھ', cell: (row) => canViewSalaryAmounts ? money(row.totalDeductionAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                  { key: 'totalLoanDeductionAmount', header: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ظ„ظپ/ط§ظ„ط£ظ‚ط³ط§ط·', cell: (row) => canViewSalaryAmounts ? money(row.totalLoanDeductionAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                  { key: 'totalNetPay', header: 'طµط§ظپظٹ ط§ظ„ظ…ط±طھط¨ط§طھ', cell: (row) => canViewSalaryAmounts ? money(row.totalNetPay) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                  { key: 'createdAt', header: 'طھط§ط±ظٹط® ط§ظ„ط¥ظ†ط´ط§ط،', cell: (row) => text(row.createdAt) },
                  { key: 'actions', header: 'ط¥ط¬ط±ط§ط،', cell: (row) => <div className="actions compact-actions">{canManagePayroll && mutations.recalculatePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.recalculatePayrollRun.mutateAsync(String(row.id)); }}>إعادة حساب</Button> : null}
                    {canManagePayroll && mutations.reviewPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.reviewPayrollRun.mutateAsync(String(row.id)); }}>مراجعة مبدئية</Button> : null}
                    {canManagePayroll && mutations.applyAttendanceDeductions ? <Button variant="secondary" onClick={() => { void mutations.applyAttendanceDeductions.mutateAsync(String(row.id)); }}>اعتماد الخصومات</Button> : null}
                    {canApprovePayroll && mutations.approvePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.approvePayrollRun.mutateAsync(String(row.id)); }}>اعتماد نهائي</Button> : null}
                    {canManagePayroll && mutations.cancelPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.cancelPayrollRun.mutateAsync(String(row.id)); }}>إلغاء</Button> : null}
                  </div> },
                ]}
              />
            </QueryFeedback>
          </FormSection>

          <FormSection title="طھظپط§طµظٹظ„ ظˆظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ…ط³ظٹط±">
            {!selectedRunId ? <p className="muted">ط§ط®طھط± ظƒط´ظپظ‹ط§ ظ…ظ† ط§ظ„ط¬ط¯ظˆظ„ ظ„ط¹ط±ط¶ طھظپط§طµظٹظ„ ط§ظ„ظ…ظˆط¸ظپظٹظ†.</p> : (
              <QueryFeedback isLoading={payrollRunDetails.isLoading} isError={payrollRunDetails.isError} error={payrollRunDetails.error} isEmpty={false} loadingText="ط¬ط§ط±ظچ طھط­ظ…ظٹظ„ طھظپط§طµظٹظ„ ط§ظ„ظ…ط³ظٹط±..." errorTitle="طھط¹ط°ط± طھط­ظ…ظٹظ„ طھظپط§طµظٹظ„ ط§ظ„ظ…ط³ظٹط±">
                {!selectedRun ? <p className="muted">طھظپط§طµظٹظ„ ط§ظ„ظ…ط³ظٹط± ط؛ظٹط± ظ…طھط§ط­ط© ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط© ط§ظ„ط­ط§ظ„ظٹط©.</p> : filteredRunItems.length ? (
                  <>
                    <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>ط§ظ„ط®طµظˆظ…ط§طھ ط§ظ„ظ…ظ‚طھط±ط­ط© ظ„ظ„ظ…ط±ط§ط¬ط¹ط© ظپظ‚ط·طŒ ظˆظ„ط§ ظٹطھظ… طھط·ط¨ظٹظ‚ظ‡ط§ طھظ„ظ‚ط§ط¦ظٹظ‹ط§ ط¥ظ„ط§ ط¨ط¹ط¯ ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ…ط³ط¤ظˆظ„.</p>
                    <DataTable
                      rows={filteredRunItems}
                      rowKey={(row) => String(row.id)}
                      density="compact"
                      columns={[
                        { key: 'employeeNo', header: 'ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => text(row.employeeNo) },
                        { key: 'employeeName', header: 'ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => text(row.employeeName) },
                        { key: 'compensationType', header: 'ظ†ظˆط¹ ط§ظ„ط£ط¬ط±', cell: (row) => normalize(row.compensationType) === 'hourly' ? 'ط£ط¬ط± ط¨ط§ظ„ط³ط§ط¹ط©' : 'ط±ط§طھط¨ ط´ظ‡ط±ظٹ' },
                        { key: 'department', header: 'ط§ظ„ظ‚ط³ظ…', cell: (row) => text(employeesMap.get(String(row.employeeId))?.departmentName) },
                        { key: 'hourlyRate', header: 'ط£ط¬ط± ط§ظ„ط³ط§ط¹ط©', cell: (row) => normalize(row.compensationType) === 'hourly' ? money(row.hourlyRate || 0) : 'ط؛ظٹط± ظ…طھط§ط­' },
                        { key: 'expectedDailyHours', header: 'ط³ط§ط¹ط§طھ ط§ظ„ظٹظˆظ… ط§ظ„ظ…طھظˆظ‚ط¹ط©', cell: (row) => normalize(row.compensationType) === 'hourly' ? String(row.expectedDailyHours || 0) : 'ط؛ظٹط± ظ…طھط§ط­' },
                        { key: 'baseSalary', header: 'ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ', cell: (row) => canViewSalaryAmounts ? money(row.baseSalary) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                        { key: 'allowanceAmount', header: 'ط§ظ„ط¨ط¯ظ„ط§طھ', cell: (row) => canViewSalaryAmounts ? money(row.allowanceAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                        { key: 'deductionAmount', header: 'ط§ظ„ط®طµظˆظ…ط§طھ', cell: (row) => canViewSalaryAmounts ? money(row.deductionAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                        { key: 'loanDeductionAmount', header: 'ط§ظ„ط³ظ„ظپ/ط§ظ„ط£ظ‚ط³ط§ط·', cell: (row) => canViewSalaryAmounts ? money(row.loanDeductionAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                        { key: 'unpaidLeave', header: 'ط¥ط¬ط§ط²ط§طھ ط؛ظٹط± ظ…ط¯ظپظˆط¹ط© / طھظ†ط¨ظٹظ‡ط§طھ', cell: (row) => Number(row.unpaidLeaveDays || 0) > 0 ? `ط؛ظٹط± ظ…ط¯ظپظˆط¹ط© ${Number(row.unpaidLeaveDays || 0)} ظٹظˆظ…` : reviewFlagText(row) },
                        { key: 'netPay', header: 'طµط§ظپظٹ ط§ظ„ط±ط§طھط¨', cell: (row) => canViewSalaryAmounts ? money(row.netPay) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                        { key: 'status', header: 'ط§ظ„ط­ط§ظ„ط©', cell: (row) => statusLabel(row.status) },
                        { key: 'reviewAttendance', header: 'ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط­ط¶ظˆط±', cell: (row) => reviewAttendanceText(row) },
                        { key: 'reviewLeaves', header: 'ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط¥ط¬ط§ط²ط§طھ', cell: (row) => reviewLeavesText(row) },
                        { key: 'suggestedDeduction', header: 'ط®طµظ… ظ…ظ‚طھط±ط­', cell: (row) => canViewSalaryAmounts ? money(Number(row.suggestedAttendanceDeductionAmount || 0) + Number(row.suggestedLeaveDeductionAmount || 0)) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
                        { key: 'details', header: 'ط¹ط±ط¶ ط§ظ„طھظپط§طµظٹظ„', cell: (row) => <details><summary>ظ…ط±ط§ط¬ط¹ط©</summary><div className="muted" style={{ marginTop: 8 }}><div>ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ: {canViewSalaryAmounts ? money(row.baseSalary) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</div><div>ظ†ظˆط¹ ط§ظ„ط£ط¬ط±: {normalize(row.compensationType) === 'hourly' ? 'ط£ط¬ط± ط¨ط§ظ„ط³ط§ط¹ط©' : 'ط±ط§طھط¨ ط´ظ‡ط±ظٹ'}</div><div>ط£ط¬ط± ط§ظ„ط³ط§ط¹ط©: {normalize(row.compensationType) === 'hourly' ? (canViewSalaryAmounts ? money(row.hourlyRate || 0) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.') : 'ط؛ظٹط± ظ…طھط§ط­'}</div><div>ط³ط§ط¹ط§طھ ط§ظ„ظٹظˆظ… ط§ظ„ظ…طھظˆظ‚ط¹ط©: {normalize(row.compensationType) === 'hourly' ? String(row.expectedDailyHours || 0) : 'ط؛ظٹط± ظ…طھط§ط­'}</div><div>ط§ظ„ط®طµظˆظ…ط§طھ: {canViewSalaryAmounts ? money(row.deductionAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</div><div>ط§ظ„ط³ظ„ظپ/ط§ظ„ط£ظ‚ط³ط§ط·: {canViewSalaryAmounts ? money(row.loanDeductionAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</div><div>ط§ظ„ط¥ط¬ط§ط²ط§طھ ط؛ظٹط± ط§ظ„ظ…ط¯ظپظˆط¹ط©: {Number(row.unpaidLeaveDays || 0)} ظٹظˆظ…</div><div>ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ظ…ط±ط§ط¬ط¹ط©: {text(row.payrollReviewNotes)}</div><div>ظ…ظ„ط§ط­ط¸ط§طھ ط¥ط¶ط§ظپظٹط©: {text(row.notes)}</div></div></details> },
                      ]}
                    />
                  </>
                ) : <p className="muted">ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط© ظ„ظ„ط¨ط­ط« ط£ظˆ ط§ظ„ظپظ„ط§طھط± ط§ظ„ط­ط§ظ„ظٹط©.</p>}
              </QueryFeedback>
            )}
          </FormSection>

          <HrPayrollOperationalNote />
        </>
      )}
      </main>
    </div>
  );
}

