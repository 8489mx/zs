import type { FormEvent } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { money, reviewStatusOptions, text, type PayrollReviewStatus } from '@/features/hr/pages/payroll/hr-payroll.helpers';

type Summary = {
  totalEmployees: number;
  totalBaseSalary: number;
  totalDeductions: number;
  totalLoanDeduction: number;
  totalNet: number;
  needsReview: number;
};

type Row = { id: string | number; employeeNo?: string; employeeName?: string; loanDeductionAmount?: number };

type Draft = { periodMonth: string; notes: string };

export type HrPayrollTopSectionProps = {
  monthFilter: string;
  search: string;
  departmentFilter: string;
  reviewStatusFilter: PayrollReviewStatus;
  runStatusFilter: string;
  departmentOptions: Array<{ value: string; label: string }>;
  runStatusOptions: Array<{ value: string; label: string }>;
  summary: Summary;
  canViewSalaryAmounts: boolean;
  dueLoanInstallmentRows: Row[];
  draft: Draft;
  formError: string;
  canManagePayroll: boolean;
  hasCreatePayrollRun: boolean;
  isCreatePending: boolean;
  onMonthFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onReviewStatusFilterChange: (value: PayrollReviewStatus) => void;
  onRunStatusFilterChange: (value: string) => void;
  onDraftChange: (updater: (current: Draft) => Draft) => void;
  onCreateRun: (event: FormEvent<HTMLFormElement>) => void;
};

export function HrPayrollTopSections(props: HrPayrollTopSectionProps) {
  const {
    monthFilter,
    search,
    departmentFilter,
    reviewStatusFilter,
    runStatusFilter,
    departmentOptions,
    runStatusOptions,
    summary,
    canViewSalaryAmounts,
    dueLoanInstallmentRows,
    draft,
    formError,
    canManagePayroll,
    hasCreatePayrollRun,
    isCreatePending,
    onMonthFilterChange,
    onSearchChange,
    onDepartmentFilterChange,
    onReviewStatusFilterChange,
    onRunStatusFilterChange,
    onDraftChange,
    onCreateRun,
  } = props;

  return (
    <>
      <Card title="ظپطھط±ط© ط§ظ„طھط´ط؛ظٹظ„ ظˆط§ظ„ظپظ„ط§طھط±">
        <div className="form-grid">
          <label className="field"><span>ط§ظ„ط´ظ‡ط±</span><input type="month" value={monthFilter} onChange={(event) => onMonthFilterChange(event.target.value)} /></label>
          <label className="field"><span>ط§ظ„ط³ظ†ط©</span><input value={monthFilter.split('-')[0] || ''} readOnly /></label>
          <label className="field field-wide"><span>ط¨ط­ط« ط§ظ„ظ…ظˆط¸ظپ (ط§ط³ظ…/ظƒظˆط¯)</span><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="ط§ظƒطھط¨ ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ ط£ظˆ ظƒظˆط¯ظ‡" /></label>
          <label className="field"><span>ط§ظ„ظ‚ط³ظ…</span><select value={departmentFilter} onChange={(event) => onDepartmentFilterChange(event.target.value)}><option value="all">ط§ظ„ظƒظ„</option>{departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>ط­ط§ظ„ط© ط§ظ„ظ…ط±ط§ط¬ط¹ط©</span><select value={reviewStatusFilter} onChange={(event) => onReviewStatusFilterChange(event.target.value as PayrollReviewStatus)}>{reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>ط­ط§ظ„ط© ط§ظ„ظ…ط³ظٹط±</span><select value={runStatusFilter} onChange={(event) => onRunStatusFilterChange(event.target.value)}><option value="all">ط§ظ„ظƒظ„</option>{runStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </Card>

      <div className="stats-grid">
        <Card title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظˆط¸ظپظٹظ†"><strong>{summary.totalEmployees || 0}</strong></Card>
        <Card title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط±ظˆط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹط©"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalBaseSalary) : 'ط؛ظٹط± ظ…طھط§ط­') : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</strong></Card>
        <Card title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط®طµظˆظ…ط§طھ"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalDeductions) : 'ط؛ظٹط± ظ…طھط§ط­') : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</strong></Card>
        <Card title="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ظ„ظپ / ط§ظ„ط£ظ‚ط³ط§ط·"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalLoanDeduction) : 'ط؛ظٹط± ظ…طھط§ط­') : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</strong></Card>
        <Card title="طµط§ظپظٹ ط§ظ„ظ…ط±طھط¨ط§طھ"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalNet) : 'ط؛ظٹط± ظ…طھط§ط­') : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</strong></Card>
        <Card title="ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©"><strong>{summary.needsReview}</strong></Card>
      </div>

      <Card title="طھظ†ط¨ظٹظ‡ ظ…ط±ط§ط¬ط¹ط©"><p className="muted" style={{ margin: 0 }}>ط­ط³ط§ط¨ ط§ظ„ط¶ط±ط§ط¦ط¨ ظˆط§ظ„طھط£ظ…ظٹظ†ط§طھ ظٹط­طھط§ط¬ ط¥ط¹ط¯ط§ط¯ط§طھ ظˆظ…ط±ط§ط¬ط¹ط© ظ…ط­ط§ط³ط¨ ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ظ‡ط§ط¦ظٹ.</p></Card>

      <Card title={`ط£ظ‚ط³ط§ط· ط³ظ„ظپ ظ…ط³طھط­ظ‚ط© ظ‡ط°ط§ ط§ظ„ط´ظ‡ط± (${monthFilter})`}>
        {!canViewSalaryAmounts ? (
          <p className="muted" style={{ margin: 0 }}>ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.</p>
        ) : dueLoanInstallmentRows.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ</th><th>ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ</th><th>ظ‚ظٹظ…ط© ط§ظ„ط£ظ‚ط³ط§ط· ط§ظ„ظ…ط³طھط­ظ‚ط©</th><th>ط­ط§ظ„ط© ط§ظ„ظ…ط±ط§ط¬ط¹ط©</th></tr></thead><tbody>{dueLoanInstallmentRows.map((row) => (<tr key={String(row.id)}><td>{text(row.employeeNo)}</td><td>{text(row.employeeName)}</td><td>{money(row.loanDeductionAmount)}</td><td>ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©</td></tr>))}</tbody></table></div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>ظ„ط§ طھظˆط¬ط¯ ط£ظ‚ط³ط§ط· ظ…ط³طھط­ظ‚ط© ظ„ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©.</p>
        )}
      </Card>

      <Card title="طھط¬ظ‡ظٹط² ظ…ط³ظٹط± ط§ظ„ظ…ط±طھط¨ط§طھ">
        {hasCreatePayrollRun && canManagePayroll ? (
          <form className="form-grid" onSubmit={onCreateRun}>
            <label className="field"><span>ط´ظ‡ط± ظ…ط³ظٹط± ط§ظ„ظ…ط±طھط¨ط§طھ *</span><input type="month" value={draft.periodMonth} onChange={(event) => onDraftChange((current) => ({ ...current, periodMonth: event.target.value }))} /></label>
            <label className="field field-wide"><span>ظ…ظ„ط§ط­ط¸ط§طھ</span><input value={draft.notes} onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))} /></label>
            {formError ? <div className="field-wide error-box">{formError}</div> : null}
            <div className="actions compact-actions field-wide"><Button type="submit" disabled={isCreatePending}>{isCreatePending ? 'ط¬ط§ط±ظچ ط§ظ„طھط¬ظ‡ظٹط²...' : 'طھط¬ظ‡ظٹط² ظ…ط³ظٹط± ط§ظ„ظ…ط±طھط¨ط§طھ'}</Button></div>
          </form>
        ) : (
          <p className="muted">ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© طھظ†ظپظٹط° ظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط،.</p>
        )}
      </Card>
    </>
  );
}
