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
      className="field field-wide"
      style={{ gridColumn: '1 / -1', background: 'rgba(15, 23, 42, 0.04)', borderRadius: 12, padding: 12 }}
    >
      <strong style={{ display: 'block', marginBottom: 8 }}>معاينة خطة السداد</strong>
      <div className="form-grid">
        <div className="field"><span>إجمالي السلفة</span><strong>{money(planPreview.principalAmount)}</strong></div>
        <div className="field"><span>عدد الدفعات</span><strong>{planPreview.installmentCount}</strong></div>
        <div className="field"><span>قيمة القسط المحسوبة</span><strong>{money(planPreview.installmentAmount)}</strong></div>
        <div className="field"><span>بداية الخصم</span><strong>{planPreview.startMonthLabel}</strong></div>
        <div className="field"><span>نهاية الخصم المتوقعة</span><strong>{planPreview.endMonthLabel}</strong></div>
        <div className="field"><span>إجمالي الأقساط</span><strong>{money(planPreview.totalInstallments)}</strong></div>
      </div>
    </div>
  );
}
