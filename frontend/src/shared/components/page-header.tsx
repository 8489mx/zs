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
    <div className={`page-header ${className}`.trim()}>
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px', minHeight: '34px' }}>
        <div className="page-header-copy" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!hideTitle && (
            <div className="page-header-title-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="العودة"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    color: '#475569',
                    fontSize: '1rem',
                  }}
                >
                  &rarr;
                </button>
              )}
              <h1 className="page-header-title" style={{ margin: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center' }}>{title}</h1>
              {badge ? <div className="page-header-badge" style={{ display: 'inline-flex', alignItems: 'center' }}>{badge}</div> : null}
            </div>
          )}
          {description ? <div className="page-header-description text-muted" style={{ fontSize: '0.8rem' }}>{description}</div> : null}
        </div>
        {actions ? <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>{actions}</div> : null}
      </div>

      {showNav ? (
        <div
          className="page-header-navigation"
          style={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'visible',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            paddingTop: '8px',
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
