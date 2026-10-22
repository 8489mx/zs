import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '@/features/hr/api/hr.api';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { HrEmployee } from '@/types/domain';
import {
  monthNames,
  money,
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
  onCancel?: () => void;
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
  onCancel,
}: HrLoanCreateFormProps) {
  const { t } = useTranslation();

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => String(e.id) === String(loanDraft.employeeId));
  }, [employees, loanDraft.employeeId]);

  // Query employee profile to get base salary from contract and existing active loans
  const profileQuery = useQuery({
    queryKey: ['hr', 'profile', loanDraft.employeeId],
    queryFn: () => hrApi.profile(loanDraft.employeeId),
    enabled: Boolean(loanDraft.employeeId),
    staleTime: 60000,
  });

  const activeContract = useMemo(() => {
    const contracts = (profileQuery.data?.contracts || []) as any[];
    return contracts.find((c) => c.status === 'active') || contracts[0] || null;
  }, [profileQuery.data?.contracts]);

  const baseSalary = useMemo(() => {
    if (activeContract?.base_salary) return Number(activeContract.base_salary);
    if (activeContract?.baseSalary) return Number(activeContract.baseSalary);
    if (selectedEmployee?.compensationType === 'hourly') {
      return Number(selectedEmployee.hourlyRate || 0) * Number(selectedEmployee.expectedDailyHours || 8) * 30;
    }
    return 0;
  }, [activeContract, selectedEmployee]);

  const existingActiveLoans = useMemo(() => {
    const loansList = (profileQuery.data?.loans || []) as any[];
    return loansList.filter((l) => Number(l.remainingAmount || l.remaining_amount || 0) > 0 && !['cancelled', 'repaid'].includes(String(l.status)));
  }, [profileQuery.data?.loans]);

  const totalRemainingLoanAmount = useMemo(() => {
    return existingActiveLoans.reduce((sum, l) => sum + Number(l.remainingAmount || l.remaining_amount || 0), 0);
  }, [existingActiveLoans]);

  const installmentPct = baseSalary > 0 && planPreview.installmentAmount > 0
    ? (planPreview.installmentAmount / baseSalary) * 100
    : 0;

  const employeeOptions = useMemo(() => [
    { value: '', label: t('hr.loans.hr_loan_create_form.s3', "اختر الموظف...") },
    ...employees.map((emp) => ({
      value: String(emp.id),
      label: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'موظف',
      hint: emp.employeeNo ? `#${emp.employeeNo}` : '',
      code: String(emp.employeeNo || emp.id),
    })),
  ], [employees, t]);

  if (!canManageLoans) {
    return <p className="muted" style={{ margin: 0 }}>{t('hr.loans.hr_loan_create_form.s0', "لا تملك صلاحية تنفيذ هذا الإجراء.")}</p>;
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Card 1: Essential Loan & Employee Details */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{t('hr.loans.hr_loan_create_form.s1', "بيانات السلفة والموظف *")}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>اختر الموظف وحدد المبلغ وتاريخ الصرف</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('hr.loans.hr_loan_create_form.s2', "الموظف المستفيد")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <CustomSelect
                value={loanDraft.employeeId || ''}
                onChange={(val) => onChange({ employeeId: val })}
                options={employeeOptions}
                placeholder={t('hr.loans.hr_loan_create_form.s3', "ابحث أو اختر الموظف...")}
              />

              {/* Dynamic Employee Financial Context Badge */}
              {loanDraft.employeeId ? (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الموظف والقسم</span>
                    <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                      {selectedEmployee?.displayName || '—'} {selectedEmployee?.departmentName ? `(${selectedEmployee.departmentName})` : ''}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الراتب الأساسي المسجل</span>
                    <strong style={{ fontSize: '0.875rem', color: baseSalary > 0 ? '#0f172a' : '#ea580c' }}>
                      {baseSalary > 0 ? money(baseSalary) : 'غير مسجل بالعقد'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>سلف نشطة قائمة</span>
                    <strong style={{ fontSize: '0.875rem', color: totalRemainingLoanAmount > 0 ? '#dc2626' : '#166534' }}>
                      {totalRemainingLoanAmount > 0 ? `${money(totalRemainingLoanAmount)} (${existingActiveLoans.length} سلفة)` : 'لا توجد سلف قائمة'}
                    </strong>
                  </div>
                  {baseSalary > 0 && planPreview.installmentAmount > 0 ? (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نسبة استقطاع القسط من الراتب</span>
                      <strong style={{
                        fontSize: '0.875rem',
                        color: installmentPct > 50 ? '#dc2626' : installmentPct > 35 ? '#d97706' : '#166534',
                      }}>
                        {installmentPct.toFixed(1)}%{installmentPct > 50 ? ' (يستغرق أكثر من نصف الراتب)' : ''}
                      </strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('hr.loans.hr_loan_create_form.s4', "قيمة السلفة (")}{getGlobalCurrencySymbol()}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
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
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('hr.loans.hr_loan_create_form.s5', "تاريخ السلفة")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
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
                  background: loanDraft.repaymentMethod === 'next_payroll_full' ? '#170e5e' : 'transparent',
                  color: loanDraft.repaymentMethod === 'next_payroll_full' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'none',
                }}
              >
                {t('hr.loans.hr_loan_create_form.s7', "خصم كامل من الراتب القادم")}
              </button>
              <button
                type="button"
                onClick={() => onChange({ repaymentMethod: 'installments' })}
                style={{
                  background: loanDraft.repaymentMethod === 'installments' ? '#170e5e' : 'transparent',
                  color: loanDraft.repaymentMethod === 'installments' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'none',
                }}
              >
                {t('hr.loans.hr_loan_create_form.s8', "تقسيط على دفعات شهرية")}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {loanDraft.repaymentMethod === 'installments' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('hr.loans.hr_loan_create_form.s9', "عدد الأقساط (شهور)")} <span style={{ color: '#dc2626' }}>*</span>
                </label>
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
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('hr.loans.hr_loan_create_form.s11', "شهر بدء الخصم")}
              </label>
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
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('hr.loans.hr_loan_create_form.s12', "سنة الخصم")}
              </label>
              <input
                inputMode="numeric"
                value={loanDraft.firstDeductionYear}
                onChange={(event) => onChange({ firstDeductionYear: normalizeArabicDigits(event.target.value).replace(/\D/g, '') })}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {t('hr.loans.hr_loan_create_form.s13', "ملاحظات إضافية")}
              </label>
              <input
                value={loanDraft.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                placeholder="سبب أو تفاصيل السلفة..."
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2.5: Immediate Disbursement Option */}
        <div style={{
          background: loanDraft.autoDisburse ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${loanDraft.autoDisburse ? '#bbf7d0' : '#e2e8f0'}`,
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: loanDraft.autoDisburse ? '#166534' : '#1e293b' }}>
              <input
                type="checkbox"
                checked={Boolean(loanDraft.autoDisburse)}
                onChange={(e) => onChange({ autoDisburse: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              اعتماد وصرف السلفة فوراً من الخزينة وتفعيل الخصم من الراتب
            </label>
            <span style={{ fontSize: '0.725rem', color: loanDraft.autoDisburse ? '#15803d' : '#64748b', paddingRight: '24px' }}>
              {loanDraft.autoDisburse
                ? 'سيتم تسجيل سند الصرف بالخزينة وإدراج قسط السلفة تلقائياً في مسير رواتب الشهر المحدد.'
                : 'سيتم حفظ السلفة كـ (مسودة) تحتاج للاعتماد والصرف اليدوي من الخزينة لاحقاً قبل إدراجها بالراتب.'}
            </span>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '6px',
            background: loanDraft.autoDisburse ? '#dcfce7' : '#e2e8f0',
            color: loanDraft.autoDisburse ? '#166534' : '#475569',
            whiteSpace: 'nowrap',
          }}>
            {loanDraft.autoDisburse ? 'صرف وتفعيل مباشر' : 'مسودة بانتظار الصرف'}
          </span>
        </div>

        {/* Card 3: Live Repayment Calculation Preview */}
        <HrLoanPlanPreview planPreview={planPreview} />

        {formError ? <div className="error-box" style={{ margin: 0 }}>{formError}</div> : null}

        <div className="actions compact-actions" style={{ justifyContent: 'flex-start', gap: '8px', marginTop: '4px' }}>
          <Button type="submit" disabled={isPending} style={{ minWidth: '130px', fontWeight: 700 }}>
            {isPending ? t('hr.loans.hr_loan_create_form.s15', "جاري الحفظ...") : t('hr.loans.hr_loan_create_form.s16', "حفظ السلفة")}
          </Button>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel} style={{ minWidth: '90px' }}>
              إلغاء التراجع
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
