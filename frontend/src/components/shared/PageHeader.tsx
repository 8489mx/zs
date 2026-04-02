import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        <div className="page-header-title-row">
          <h1 className="page-header-title">{title}</h1>
          {badge ? <div className="page-header-badge">{badge}</div> : null}
        </div>
        {description ? <p className="page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
