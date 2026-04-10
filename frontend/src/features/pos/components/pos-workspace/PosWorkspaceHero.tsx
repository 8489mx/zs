import { Card } from '@/shared/ui/card';

export function PosWorkspaceHero({
  selectedCustomerName,
  paymentLabel,
  ownOpenShift,
  workflowSteps,
  canSubmitSale,
  nextStepLabel,
  shortSummary,
}: {
  selectedCustomerName: string;
  paymentLabel: string;
  ownOpenShift: boolean;
  workflowSteps: { key: string; title: string; hint: string }[];
  canSubmitSale: boolean;
  nextStepLabel: string;
  shortSummary: Array<{ key: string; label: string; value: string }>;
}) {
  return (
    <div className="pos-hero-grid">
      <Card className="pos-hero-card">
        <div className="pos-hero-copy">
          <span className="pos-hero-kicker">تشغيل البيع اليومي</span>
          <h2>سجل البيع من شاشة واحدة واضحة وسريعة.</h2>
          <div className="pos-hero-chips">
            <div className="pos-hero-chip"><span>الحالة الحالية</span><strong>{ownOpenShift ? 'جاهز للبيع' : 'يلزم وردية'}</strong></div>
            <div className="pos-hero-chip"><span>نوع الدفع</span><strong>{paymentLabel}</strong></div>
            <div className="pos-hero-chip"><span>العميل</span><strong>{selectedCustomerName}</strong></div>
          </div>
          <div className="pos-workflow-grid">
            {workflowSteps.map((step) => (
              <div key={step.key} className="pos-workflow-step">
                <strong>{step.title}</strong>
                <span>{step.hint}</span>
              </div>
            ))}
          </div>
          <div className={`surface-note pos-next-step-note ${canSubmitSale ? 'is-ready' : ''}`.trim()}>
            {canSubmitSale ? 'جاهز للإغلاق الآن. راجع السلة ثم اضغط F9.' : `الخطوة التالية: ${nextStepLabel}`}
          </div>
        </div>
      </Card>

      <div className="stats-grid compact-grid workspace-stats-grid pos-premium-stats-grid">
        {shortSummary.map((item) => (
          <div key={item.key} className="stat-card compact-stat-card pos-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
