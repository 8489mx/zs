import { Button } from '@/shared/ui/button';
import { normalizeNumericInput } from '@/features/hr/pages/loans/hr-loans.helpers';

type RepaymentDraft = {
  amount: string;
  method: string;
  notes: string;
};

type HrLoanRepaymentFormProps = {
  selectedLoanLabel: string;
  remainingAmountText: string;
  repaymentDraft: RepaymentDraft;
  repaymentError: string;
  isPending: boolean;
  onChange: (patch: Partial<RepaymentDraft>) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function HrLoanRepaymentForm({
  selectedLoanLabel,
  remainingAmountText,
  repaymentDraft,
  repaymentError,
  isPending,
  onChange,
  onSubmit,
  onCancel,
}: HrLoanRepaymentFormProps) {
  return (
    <form className="form-grid" style={{ marginTop: 12 }} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label className="field">
        <span>ط§ظ„ط³ظ„ظپط© ط§ظ„ظ…ط­ط¯ط¯ط©</span>
        <input value={selectedLoanLabel} disabled />
      </label>
      <label className="field">
        <span>ط§ظ„ظ…طھط¨ظ‚ظٹ</span>
        <input value={remainingAmountText} disabled />
      </label>
      <label className="field">
        <span>ظ‚ظٹظ…ط© ط§ظ„ط³ط¯ط§ط¯</span>
        <input inputMode="decimal" value={repaymentDraft.amount} onChange={(event) => onChange({ amount: normalizeNumericInput(event.target.value) })} />
      </label>
      <label className="field">
        <span>ط·ط±ظٹظ‚ط© ط§ظ„ط³ط¯ط§ط¯</span>
        <input value={repaymentDraft.method} onChange={(event) => onChange({ method: event.target.value })} />
      </label>
      <label className="field field-wide">
        <span>ظ…ظ„ط§ط­ط¸ط§طھ</span>
        <input value={repaymentDraft.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>

      {repaymentError ? <div className="field-wide error-box">{repaymentError}</div> : null}

      <div className="actions compact-actions field-wide">
        <Button type="submit" disabled={isPending}>{isPending ? 'ط¬ط§ط±ظٹ ط§ظ„طھط³ط¬ظٹظ„...' : 'طھط³ط¬ظٹظ„ ط³ط¯ط§ط¯'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>ط¥ظ„ط؛ط§ط،</Button>
      </div>
    </form>
  );
}
