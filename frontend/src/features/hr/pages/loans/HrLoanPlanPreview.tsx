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
        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>معاينة خطة السداد المحسوبة</strong>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>يتم تحديثها فورياً مع تغيير القيمة أو الأقساط</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>إجمالي السلفة</span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{money(planPreview.principalAmount)}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>عدد الدفعات</span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{planPreview.installmentCount}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>قيمة القسط الشهري</span>
          <strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>{money(planPreview.installmentAmount)}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>بداية الخصم</span>
          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{planPreview.startMonthLabel}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نهاية الخصم المتوقعة</span>
          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{planPreview.endMonthLabel}</strong>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>إجمالي الخصم</span>
          <strong style={{ fontSize: '0.95rem', color: '#166534' }}>{money(planPreview.totalInstallments)}</strong>
        </div>
      </div>
    </div>
  );
}
