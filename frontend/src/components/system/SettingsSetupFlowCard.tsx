import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { type SetupSectionKey, useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';

interface SettingsSetupFlowCardProps {
  currentSection: SetupSectionKey | 'overview' | 'backup' | 'diagnostics' | 'readiness';
}

export function SettingsSetupFlowCard({ currentSection }: SettingsSetupFlowCardProps) {
  const navigate = useNavigate();
  const flow = useFirstRunSetupFlow();

  if (!flow.enabled || flow.isComplete) return null;

  const activeStep = flow.currentStep;
  if (!activeStep) return null;

  const onStepSection = currentSection === activeStep.section;
  const nextStep = flow.nextStep;
  const previousStep = flow.previousStep;
  const canAdvance = onStepSection && activeStep.done;
  const canSubmitCurrentStep = onStepSection && activeStep.key === 'store' && !activeStep.done;
  const canSubmitReferenceStep = onStepSection && activeStep.key === 'branch-location' && !activeStep.done;

  function handlePrevious() {
    if (!previousStep) return;
    navigate(previousStep.to);
  }

  function handleNext() {
    if (!canAdvance) return;
    if (nextStep) {
      navigate(nextStep.to);
      return;
    }
    navigate('/settings/overview');
  }

  return (
    <Card
      title={`تجهيز البداية · الخطوة ${flow.completedCount + 1} من ${flow.totalCount}`}
      actions={<span className="status-badge">{flow.completedCount}/{flow.totalCount}</span>}
      className="settings-setup-flow-card"
    >
      <div className="setup-flow-card-body">
        <div className="filter-chip-row toolbar-chip-row" style={{ marginBottom: 4 }}>
          {flow.steps.map((step, index) => (
            <span key={step.key} className={`status-badge ${step.done ? 'status-badge-success' : activeStep.key === step.key ? 'status-badge-warning' : ''}`.trim()}>
              {index + 1}. {step.title}
            </span>
          ))}
        </div>
        <strong>{activeStep.title}</strong>
        <div className="setup-flow-card-actions">
          {previousStep ? (
            <Button variant="secondary" onClick={handlePrevious}>
              الخطوة السابقة
            </Button>
          ) : null}
          {!onStepSection ? (
            <Link className="button button-secondary" to={activeStep.to}>{activeStep.ctaLabel}</Link>
          ) : null}
          {canSubmitCurrentStep ? (
            <Button variant="primary" type="submit" form="settings-main-form" title="احفظ بيانات المتجر أولًا للانتقال إلى الخطوة التالية">
              حفظ والانتقال للخطوة التالية
            </Button>
          ) : canSubmitReferenceStep ? (
            <Button variant="secondary" disabled title="أكمل تجهيز المتجر والمخزن الأساسي للمتابعة">
              أكمل تعريف المتجر ونقطة التشغيل أولًا
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleNext} disabled={!canAdvance} title={!canAdvance ? 'أكمل هذه الخطوة أولًا ثم انتقل للتالية' : undefined}>
              {nextStep ? activeStep.nextLabel : 'إنهاء التهيئة'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
