import { useTranslation } from 'react-i18next';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
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
  const { t } = useTranslation();
  const [employeeQuery, setEmployeeQuery] = useState('');

  useEffect(() => {
    if (loanDraft.employeeId) {
      const emp = employees.find(e => String(e.id) === String(loanDraft.employeeId));
      if (emp) {
        setEmployeeQuery(employeeName(emp));
      }
    } else {
      setEmployeeQuery('');
    }
  }, [loanDraft.employeeId, employees]);

  if (!canManageLoans) {
    return <p className="muted" style={{ margin: 0 }}>{t('hr.loans.hr_loan_create_form.s0', "لا تملك صلاحية تنفيذ هذا الإجراء.")}</p>;
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Card 1: Essential Loan Details */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.loans.hr_loan_create_form.s1', "بيانات السلفة *")}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <SearchableCombobox
                label={t('hr.loans.hr_loan_create_form.s2', "الموظف *")}
                placeholder={t('hr.loans.hr_loan_create_form.s3', "اختر الموظف...")}
                value={employeeQuery}
                onChange={(q) => {
                  setEmployeeQuery(q);
                  if (!q) onChange({ employeeId: '' });
                }}
                onSelect={(row) => {
                  setEmployeeQuery(employeeName(row));
                  onChange({ employeeId: String(row.id) });
                }}
                options={employees}
                search={(row, q) => {
                  const query = q.toLowerCase();
                  return employeeName(row).toLowerCase().includes(query) || 
                        String(row.employeeNo || '').toLowerCase().includes(query);
                }}
                getLabel={(row) => employeeName(row)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.loans.hr_loan_create_form.s4', "قيمة السلفة (")}{getGlobalCurrencySymbol()}) <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                inputMode="decimal"
                value={loanDraft.principalAmount}
                onChange={(event) => onChange({ principalAmount: normalizeNumericInput(event.target.value) })}
                placeholder="0.00"
                required
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.loans.hr_loan_create_form.s5', "تاريخ السلفة")} <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                value={loanDraft.issueDate}
                onChange={(event) => onChange({ issueDate: event.target.value })}
                required
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Repayment Plan */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{t('hr.loans.hr_loan_create_form.s6', "طريقة وخطة السداد")}</span>
            <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => onChange({ repaymentMethod: 'next_payroll_full' })}
                style={{
                  background: loanDraft.repaymentMethod === 'next_payroll_full' ? 'var(--primary, #170c5c)' : 'transparent',
                  color: loanDraft.repaymentMethod === 'next_payroll_full' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t('hr.loans.hr_loan_create_form.s7', "خصم كامل من الراتب القادم")}
              </button>
              <button
                type="button"
                onClick={() => onChange({ repaymentMethod: 'installments' })}
                style={{
                  background: loanDraft.repaymentMethod === 'installments' ? 'var(--primary, #170c5c)' : 'transparent',
                  color: loanDraft.repaymentMethod === 'installments' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t('hr.loans.hr_loan_create_form.s8', "تقسيط على دفعات شهرية")}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {loanDraft.repaymentMethod === 'installments' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.loans.hr_loan_create_form.s9', "عدد الأقساط (شهور)")} <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  inputMode="numeric"
                  value={loanDraft.installmentCount}
                  onChange={(event) => onChange({ installmentCount: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
                  placeholder={t('hr.loans.hr_loan_create_form.s10', "مثال: 3")}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            ) : null}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.loans.hr_loan_create_form.s11', "شهر بدء الخصم")}</label>
              <select
                value={loanDraft.firstDeductionMonth}
                onChange={(event) => onChange({ firstDeductionMonth: event.target.value })}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              >
                {monthNames.map((label, index) => {
                  const value = String(index + 1).padStart(2, '0');
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.loans.hr_loan_create_form.s12', "سنة الخصم")}</label>
              <input
                inputMode="numeric"
                value={loanDraft.firstDeductionYear}
                onChange={(event) => onChange({ firstDeductionYear: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.loans.hr_loan_create_form.s13', "ملاحظات إضافية")}</label>
              <input
                value={loanDraft.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                placeholder={t('hr.loans.hr_loan_create_form.s14', "سبب أو ملاحظات السلفة...")}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Live Repayment Calculation Preview */}
        <HrLoanPlanPreview planPreview={planPreview} />

        {formError ? <div className="error-box" style={{ margin: 0 }}>{formError}</div> : null}

        <div className="actions compact-actions" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
          <Button type="submit" disabled={isPending} style={{ minWidth: '140px' }}>{isPending ? t('hr.loans.hr_loan_create_form.s15', "جاري الحفظ...") : t('hr.loans.hr_loan_create_form.s16', "حفظ السلفة")}</Button>
        </div>
      </div>
    </form>
  );
}
