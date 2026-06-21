import { Link } from 'react-router-dom';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';

export function FirstRunSetupChecklist() {
  const flow = useFirstRunSetupFlow();

  if (!flow.enabled) return null;

  const show = flow.isError || !flow.isComplete;
  if (!show) return null;

  const primaryActionLabel = flow.completedCount > 0 ? 'استكمال الإعداد' : 'ابدأ الإعداد';
  const progressPercentage = Math.round((flow.completedCount / flow.totalCount) * 100) || 0;

  return (
    <div className="setup-premium-shell">
      <div className="setup-premium-header">
        <div className="setup-premium-title-row">
          <div className="setup-premium-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 className="setup-premium-title">جهز نظامك في دقائق</h2>
            <p className="setup-premium-subtitle">
              أكمل الإعدادات الأساسية لتفعيل حسابك وظهور التقارير بشكل صحيح.
            </p>
          </div>
        </div>
        <div className="setup-premium-progress-area">
          <div className="setup-progress-meta">
            <span>نسبة الإنجاز</span>
            <strong>{progressPercentage}%</strong>
          </div>
          <div className="setup-progress-track tone-surface">
            <div className="setup-progress-fill tone-primary" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </div>

      <div className="setup-premium-steps">
        {flow.steps.map((step, index) => {
          const isActive = index === flow.currentStepIndex;
          const isDone = step.done;
          
          return (
            <div key={step.key} className={`setup-step-card ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}>
              <div className="setup-step-indicator">
                {isDone ? (
                  <div className="setup-step-icon success">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <div className={`setup-step-number ${isActive ? 'active' : ''}`}>{index + 1}</div>
                )}
              </div>
              <div className="setup-step-content">
                <div className="setup-step-info">
                  <strong>{step.title}</strong>
                </div>
                <div className="setup-step-action">
                  {isDone ? (
                    <span className="setup-status-done">مكتمل</span>
                  ) : isActive ? (
                    <Link className="button button-primary setup-btn-pulse" to={step.to}>{step.ctaLabel}</Link>
                  ) : (
                    <Link className="button button-secondary" to={step.to}>{step.ctaLabel}</Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
