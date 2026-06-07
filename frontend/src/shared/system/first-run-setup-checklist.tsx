import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';

export function FirstRunSetupChecklist() {
  const flow = useFirstRunSetupFlow();

  if (!flow.enabled) return null;

  const show = flow.isError || !flow.isComplete;
  if (!show) return null;

  const primaryActionLabel = flow.completedCount > 0 ? 'استكمال الإعداد' : 'ابدأ الإعداد';

  return (
    <Card
      title="جهز نظامك في دقائق"
      actions={<span className="status-badge">{flow.isLoading ? 'جاري الفحص...' : `${flow.completedCount}/${flow.totalCount}`}</span>}
      className="first-run-checklist"
    >
      <div className="stack gap-12">
        <p className="muted" style={{ margin: 0 }}>
          أكمل الإعدادات الأساسية عشان تظهر الفواتير والتقارير بشكل صحيح.
        </p>
        <div className="setup-prompt-actions">
          <Link className="button button-primary" to={flow.currentStep?.to || '/settings/core?setup=1'}>
            {primaryActionLabel}
          </Link>
        </div>
        <div className="list-stack">
          {flow.steps.map((step) => (
            <div key={step.key} className="list-row stacked-row first-run-checklist-row">
              <div>
                <strong>{step.title}</strong>
              </div>
              {step.done ? (
                <span className="status-badge">مكتمل</span>
              ) : (
                <Link className="button button-secondary" to={step.to}>{step.ctaLabel}</Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
