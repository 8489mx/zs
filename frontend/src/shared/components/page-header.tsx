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
  navigation?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className = '',
  hideTitle = false,
  onBack,
  navigation,
  children,
}: PageHeaderProps) {
  const location = useLocation();
  const isHrPage = location.pathname.startsWith('/hr') || location.pathname === '/settings/hr';
  const showNav = navigation !== undefined ? navigation : (isHrPage ? <HrSectionNav /> : null);

  return (
    <div className={`page-header ${className}`.trim()} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div className="page-header-copy">
          {!hideTitle && (
            <div className="page-header-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="العودة"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
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

      {showNav ? (
        <div
          className="page-header-navigation"
          style={{
            width: '100%',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            paddingTop: '12px',
            marginTop: '2px',
          }}
        >
          {showNav}
        </div>
      ) : null}

      {children}
    </div>
  );
}
