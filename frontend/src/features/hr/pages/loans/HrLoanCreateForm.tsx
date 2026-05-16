import { Button } from '@/shared/ui/button';
import type { HrEmployee } from '@/types/domain';
import {
  employeeName,
  monthNames,
  normalizeArabicDigits,
  normalizeNumericInput,
  type LoanDraft,
} from '@/features/hr/pages/loans/hr-loans.helpers';
import { HrLoanPlanPreview } from '@/features/hr/pages/loans/HrLoanPlanPreview';

type PlanPreview = {
  principalAmount: number;
  installmentCount: number;
  installmentAmount: number;
  totalInstallments: number;
  startMonthLabel: string;
  endMonthLabel: string;
};

type HrLoanCreateFormProps = {
  loanDraft: LoanDraft;
  employees: HrEmployee[];
  canManageLoans: boolean;
  formError: string;
  planPreview: PlanPreview;
  isPending: boolean;
  onChange: (patch: Partial<LoanDraft>) => void;
  onSubmit: () => void;
};

export function HrLoanCreateForm({
  loanDraft,
  employees,
  canManageLoans,
  formError,
  planPreview,
  isPending,
  onChange,
  onSubmit,
}: HrLoanCreateFormProps) {
  if (!canManageLoans) {
    return <p className="muted" style={{ margin: 0 }}>ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© طھظ†ظپظٹط° ظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط،.</p>;
  }

  return (
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label className="field">
        <span>ط§ظ„ظ…ظˆط¸ظپ *</span>
        <select value={loanDraft.employeeId} onChange={(event) => onChange({ employeeId: event.target.value })}>
          <option value="">ط§ط®طھط± ط§ظ„ظ…ظˆط¸ظپ</option>
          {employees.map((row) => (
            <option key={String(row.id)} value={String(row.id)}>{employeeName(row)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>ظ†ظˆط¹ ط§ظ„ط³ظ„ظپط©</span>
        <select value={loanDraft.loanType} onChange={(event) => onChange({ loanType: event.target.value })}>
          <option value="advance">ط³ظ„ظپط©</option>
          <option value="loan">ظ‚ط±ط¶</option>
        </select>
      </label>
      <label className="field">
        <span>ظ‚ظٹظ…ط© ط§ظ„ط³ظ„ظپط© *</span>
        <input
          inputMode="decimal"
          value={loanDraft.principalAmount}
          onChange={(event) => onChange({ principalAmount: normalizeNumericInput(event.target.value) })}
          placeholder="0.00"
        />
      </label>
      <label className="field">
        <span>طھط§ط±ظٹط® ط§ظ„ط³ظ„ظپط© *</span>
        <input type="date" value={loanDraft.issueDate} onChange={(event) => onChange({ issueDate: event.target.value })} />
      </label>

      <div className="field field-wide">
        <span>ط®ط·ط© ط§ظ„ط³ط¯ط§ط¯</span>
        <div className="actions compact-actions" style={{ marginTop: 8 }}>
          <Button
            type="button"
            variant={loanDraft.repaymentMethod === 'next_payroll_full' ? 'primary' : 'secondary'}
            onClick={() => onChange({ repaymentMethod: 'next_payroll_full' })}
          >
            ط®طµظ… ظƒط§ظ…ظ„ ظ…ظ† ط§ظ„ط±ط§طھط¨ ط§ظ„ظ‚ط§ط¯ظ…
          </Button>
          <Button
            type="button"
            variant={loanDraft.repaymentMethod === 'installments' ? 'primary' : 'secondary'}
            onClick={() => onChange({ repaymentMethod: 'installments' })}
          >
            طھظ‚ط³ظٹط· ط¹ظ„ظ‰ ط¯ظپط¹ط§طھ
          </Button>
        </div>
      </div>

      {loanDraft.repaymentMethod === 'installments' ? (
        <>
          <label className="field">
            <span>ط¹ط¯ط¯ ط§ظ„ط¯ظپط¹ط§طھ</span>
            <input
              inputMode="numeric"
              value={loanDraft.installmentCount}
              onChange={(event) => onChange({ installmentCount: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
            />
          </label>
          <label className="field">
            <span>ط¨ط¯ط§ظٹط© ط§ظ„ط®طµظ… ظ…ظ† ط´ظ‡ط±</span>
            <select value={loanDraft.firstDeductionMonth} onChange={(event) => onChange({ firstDeductionMonth: event.target.value })}>
              {monthNames.map((label, index) => {
                const value = String(index + 1).padStart(2, '0');
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </label>
          <label className="field">
            <span>ط³ظ†ط© ط§ظ„ط¨ط¯ط§ظٹط©</span>
            <input
              inputMode="numeric"
              value={loanDraft.firstDeductionYear}
              onChange={(event) => onChange({ firstDeductionYear: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
            />
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span>ط´ظ‡ط± ط§ظ„ط®طµظ…</span>
            <select value={loanDraft.firstDeductionMonth} onChange={(event) => onChange({ firstDeductionMonth: event.target.value })}>
              {monthNames.map((label, index) => {
                const value = String(index + 1).padStart(2, '0');
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </label>
          <label className="field">
            <span>ط³ظ†ط© ط§ظ„ط®طµظ…</span>
            <input
              inputMode="numeric"
              value={loanDraft.firstDeductionYear}
              onChange={(event) => onChange({ firstDeductionYear: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
            />
          </label>
        </>
      )}

      <label className="field field-wide">
        <span>ظ…ظ„ط§ط­ط¸ط§طھ</span>
        <input value={loanDraft.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>

      <HrLoanPlanPreview planPreview={planPreview} />

      {formError ? <div className="field-wide error-box">{formError}</div> : null}

      <div className="actions compact-actions field-wide">
        <Button type="submit" disabled={isPending}>{isPending ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...' : 'ط­ظپط¸ ط§ظ„ط³ظ„ظپط©'}</Button>
      </div>
    </form>
  );
}
