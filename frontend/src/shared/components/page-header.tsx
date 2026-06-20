import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { HrSectionNav } from '@/features/hr/components/HrSectionNav';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  hideTitle?: boolean;
}

export function PageHeader({ title, description, badge, actions, className = '', hideTitle = false }: PageHeaderProps) {
  const location = useLocation();
  const showHrNavigation = location.pathname.startsWith('/hr');

  return (
    <>
      {showHrNavigation ? <HrSectionNav /> : null}
      <div className={`page-header ${className}`.trim()}>
        <div className="page-header-copy">
          {!hideTitle && (
            <div className="page-header-title-row">
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
