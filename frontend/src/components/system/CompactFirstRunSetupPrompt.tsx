import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';

export function CompactFirstRunSetupPrompt() {
  const flow = useFirstRunSetupFlow();

  if (!flow.enabled || flow.isComplete) return null;

  return (
    <Card
      title="أول مرة تستخدم البرنامج؟"
      actions={<span className="status-badge">{flow.completedCount}/{flow.totalCount}</span>}
      className="setup-prompt-card"
    >
      <div className="setup-prompt-actions">
        <Link className="button button-secondary" to={flow.currentStep?.to || '/settings/core?setup=1'}>
          ابدأ تهيئة البرنامج على محلك
        </Link>
      </div>
    </Card>
  );
}
