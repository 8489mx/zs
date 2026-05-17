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
    return <p className="muted" style={{ margin: 0 }}>لا تملك صلاحية تنفيذ هذا الإجراء.</p>;
  }

  return (
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label className="field">
        <span>الموظف *</span>
        <select value={loanDraft.employeeId} onChange={(event) => onChange({ employeeId: event.target.value })}>
          <option value="">اختر الموظف</option>
          {employees.map((row) => (
            <option key={String(row.id)} value={String(row.id)}>{employeeName(row)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>نوع السلفة</span>
        <select value={loanDraft.loanType} onChange={(event) => onChange({ loanType: event.target.value })}>
          <option value="advance">سلفة</option>
          <option value="loan">قرض</option>
        </select>
      </label>
      <label className="field">
        <span>قيمة السلفة *</span>
        <input
          inputMode="decimal"
          value={loanDraft.principalAmount}
          onChange={(event) => onChange({ principalAmount: normalizeNumericInput(event.target.value) })}
          placeholder="0.00"
        />
      </label>
      <label className="field">
        <span>تاريخ السلفة *</span>
        <input type="date" value={loanDraft.issueDate} onChange={(event) => onChange({ issueDate: event.target.value })} />
      </label>

      <div className="field field-wide">
        <span>خطة السداد</span>
        <div className="actions compact-actions" style={{ marginTop: 8 }}>
          <Button
            type="button"
            variant={loanDraft.repaymentMethod === 'next_payroll_full' ? 'primary' : 'secondary'}
            onClick={() => onChange({ repaymentMethod: 'next_payroll_full' })}
          >
            خصم كامل من الراتب القادم
          </Button>
          <Button
            type="button"
            variant={loanDraft.repaymentMethod === 'installments' ? 'primary' : 'secondary'}
            onClick={() => onChange({ repaymentMethod: 'installments' })}
          >
            تقسيط على دفعات
          </Button>
        </div>
      </div>

      {loanDraft.repaymentMethod === 'installments' ? (
        <>
          <label className="field">
            <span>عدد الدفعات</span>
            <input
              inputMode="numeric"
              value={loanDraft.installmentCount}
              onChange={(event) => onChange({ installmentCount: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
            />
          </label>
          <label className="field">
            <span>بداية الخصم من شهر</span>
            <select value={loanDraft.firstDeductionMonth} onChange={(event) => onChange({ firstDeductionMonth: event.target.value })}>
              {monthNames.map((label, index) => {
                const value = String(index + 1).padStart(2, '0');
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </label>
          <label className="field">
            <span>سنة البداية</span>
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
            <span>شهر الخصم</span>
            <select value={loanDraft.firstDeductionMonth} onChange={(event) => onChange({ firstDeductionMonth: event.target.value })}>
              {monthNames.map((label, index) => {
                const value = String(index + 1).padStart(2, '0');
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </label>
          <label className="field">
            <span>سنة الخصم</span>
            <input
              inputMode="numeric"
              value={loanDraft.firstDeductionYear}
              onChange={(event) => onChange({ firstDeductionYear: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
            />
          </label>
        </>
      )}

      <label className="field field-wide">
        <span>ملاحظات</span>
        <input value={loanDraft.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>

      <HrLoanPlanPreview planPreview={planPreview} />

      {formError ? <div className="field-wide error-box">{formError}</div> : null}

      <div className="actions compact-actions field-wide">
        <Button type="submit" disabled={isPending}>{isPending ? 'جاري الحفظ...' : 'حفظ السلفة'}</Button>
      </div>
    </form>
  );
}
