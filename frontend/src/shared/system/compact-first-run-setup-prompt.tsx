import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';

export function CompactFirstRunSetupPrompt() {
  const flow = useFirstRunSetupFlow();

  if (!flow.enabled || flow.isLoading || flow.isComplete) return null;

  const primaryActionLabel = flow.completedCount > 0 ? 'استكمال الإعداد' : 'ابدأ الإعداد';

  return (
    <Card
      title="جهز نظامك في دقائق"
      actions={<span className="status-badge">{flow.completedCount}/{flow.totalCount}</span>}
      className="setup-prompt-card"
    >
      <p className="muted" style={{ marginTop: 0 }}>أكمل الإعدادات الأساسية عشان تظهر الفواتير والتقارير بشكل صحيح.</p>
      <div className="setup-prompt-actions">
        <Link className="button button-secondary" to={flow.currentStep?.to || '/settings/core?setup=1'}>
          {primaryActionLabel}
        </Link>
      </div>
    </Card>
  );
}
