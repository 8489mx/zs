import { useTranslation } from 'react-i18next';
import { money } from '@/features/hr/pages/loans/hr-loans.helpers';

type PlanPreview = {
  principalAmount: number;
  installmentCount: number;
  installmentAmount: number;
  totalInstallments: number;
  startMonthLabel: string;
  endMonthLabel: string;
};

export function HrLoanPlanPreview({ planPreview }: { planPreview: PlanPreview }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{t('hr.loans.hr_loan_plan_preview.s0', "معاينة خطة السداد المحسوبة")}</strong>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('hr.loans.hr_loan_plan_preview.s1', "يتم تحديثها فورياً مع تغيير القيمة أو الأقساط")}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.loans.hr_loan_plan_preview.s2', "إجمالي السلفة")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{money(planPreview.principalAmount)}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.loans.hr_loan_plan_preview.s3', "عدد الدفعات")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{planPreview.installmentCount}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.loans.hr_loan_plan_preview.s4', "قيمة القسط الشهري")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>{money(planPreview.installmentAmount)}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.loans.hr_loan_plan_preview.s5', "بداية الخصم")}</span>
          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{planPreview.startMonthLabel}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.loans.hr_loan_plan_preview.s6', "نهاية الخصم المتوقعة")}</span>
          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{planPreview.endMonthLabel}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.loans.hr_loan_plan_preview.s7', "إجمالي الخصم")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#166534' }}>{money(planPreview.totalInstallments)}</strong>
        </div>
      </div>
    </div>
  );
}
