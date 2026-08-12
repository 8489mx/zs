import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { HrSectionNav } from '@/features/hr/components/HrSectionNav';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  hideTitle?: boolean;
  onBack?: () => void;
}

export function PageHeader({ title, description, badge, actions, className = '', hideTitle = false, onBack }: PageHeaderProps) {
  const location = useLocation();
  const showHrNavigation = location.pathname.startsWith('/hr') || location.pathname === '/settings/hr';

  return (
    <>
      {showHrNavigation ? <HrSectionNav /> : null}
      <div className={`page-header ${className}`.trim()}>
        <div className="page-header-copy">
          {!hideTitle && (
            <div className="page-header-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {onBack && (
                <button type="button" onClick={onBack} aria-label="العودة" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  &rarr;
                </button>
              )}
              <h1 className="page-header-title">{title}</h1>
              {badge ? <div className="page-header-badge">{badge}</div> : null}
            </div>
          )}
          {description ? <p className="page-header-description">{description}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </>
  );
}
