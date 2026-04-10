import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';

export function FirstRunSetupChecklist() {
  const flow = useFirstRunSetupFlow();

  if (!flow.enabled) return null;

  const show = flow.isError || !flow.isComplete;
  if (!show) return null;

  return (
    <Card
      title={SINGLE_STORE_MODE ? 'قبل أول عملية بيع' : 'قائمة تهيئة أول تشغيل'}
      actions={<span className="status-badge">{flow.isLoading ? 'جاري الفحص...' : `${flow.completedCount}/${flow.totalCount}`}</span>}
      className="first-run-checklist"
    >
      <div className="list-stack">
        {flow.steps.map((step) => (
          <div key={step.key} className="list-row stacked-row first-run-checklist-row">
            <div>
              <strong>{step.done ? '✓ ' : '• '}{step.title}</strong>
            </div>
            {step.done ? (
              <span className="status-badge">مكتمل</span>
            ) : (
              <Link className="button button-secondary" to={step.to}>{step.ctaLabel}</Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
