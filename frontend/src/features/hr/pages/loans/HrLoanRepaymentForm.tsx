import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <form className="form-grid" style={{ marginTop: 12 }} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label className="field">
        <span>{t('hr.loans.hr_loan_repayment_form.s0', "السلفة المحددة")}</span>
        <input value={selectedLoanLabel} disabled />
      </label>
      <label className="field">
        <span>{t('hr.loans.hr_loan_repayment_form.s1', "المتبقي")}</span>
        <input value={remainingAmountText} disabled />
      </label>
      <label className="field">
        <span>{t('hr.loans.hr_loan_repayment_form.s2', "قيمة السداد")}</span>
        <input inputMode="decimal" value={repaymentDraft.amount} onChange={(event) => onChange({ amount: normalizeNumericInput(event.target.value) })} />
      </label>
      <label className="field">
        <span>{t('hr.loans.hr_loan_repayment_form.s3', "طريقة السداد")}</span>
        <select value={repaymentDraft.method || 'manual_cash'} onChange={(event) => onChange({ method: event.target.value })}>
          <option value="manual_cash">{t('hr.loans.hr_loan_repayment_form.s4', "سداد نقدي")}</option>
          <option value="salary_deduction">{t('hr.loans.hr_loan_repayment_form.s5', "خصم من المرتب")}</option>
        </select>
      </label>
      <label className="field field-wide">
        <span>{t('hr.loans.hr_loan_repayment_form.s6', "ملاحظات")}</span>
        <input value={repaymentDraft.notes} onChange={(event) => onChange({ notes: event.target.value })} placeholder={t('hr.loans.hr_loan_repayment_form.s7', "اختياري")} />
      </label>

      {repaymentError ? <div className="field-wide error-box">{repaymentError}</div> : null}

      <div className="actions compact-actions field-wide">
        <Button type="submit" disabled={isPending}>{isPending ? t('hr.loans.hr_loan_repayment_form.s8', "جاري التسجيل...") : t('hr.loans.hr_loan_repayment_form.s9', "تسجيل سداد")}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('hr.loans.hr_loan_repayment_form.s10', "إلغاء")}</Button>
      </div>
    </form>
  );
}
