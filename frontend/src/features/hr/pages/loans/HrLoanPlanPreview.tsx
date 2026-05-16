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
    <div className="field field-wide" style={{ background: 'rgba(15, 23, 42, 0.04)', borderRadius: 12, padding: 12 }}>
      <strong style={{ display: 'block', marginBottom: 8 }}>ظ…ط¹ط§ظٹظ†ط© ط®ط·ط© ط§ظ„ط³ط¯ط§ط¯</strong>
      <div className="form-grid">
        <div className="field"><span>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ظ„ظپط©</span><strong>{money(planPreview.principalAmount)}</strong></div>
        <div className="field"><span>ط¹ط¯ط¯ ط§ظ„ط¯ظپط¹ط§طھ</span><strong>{planPreview.installmentCount}</strong></div>
        <div className="field"><span>ظ‚ظٹظ…ط© ط§ظ„ظ‚ط³ط· ط§ظ„ظ…ط­ط³ظˆط¨ط©</span><strong>{money(planPreview.installmentAmount)}</strong></div>
        <div className="field"><span>ط¨ط¯ط§ظٹط© ط§ظ„ط®طµظ…</span><strong>{planPreview.startMonthLabel}</strong></div>
        <div className="field"><span>ظ†ظ‡ط§ظٹط© ط§ظ„ط®طµظ… ط§ظ„ظ…طھظˆظ‚ط¹ط©</span><strong>{planPreview.endMonthLabel}</strong></div>
        <div className="field"><span>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£ظ‚ط³ط§ط·</span><strong>{money(planPreview.totalInstallments)}</strong></div>
      </div>
    </div>
  );
}
