import { ReactNode } from 'react';

export interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  actions?: ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  actions,
}: FormSectionProps) {
  return (
    <section className={`document-prototype-section ${className}`.trim()}>
      <div className={`document-prototype-section-header ${headerClassName}`.trim()} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="document-prototype-section-title" style={{ margin: 0 }}>{title}</h3>
          {description && (
            <p className="muted small" style={{ margin: '4px 0 0 0', paddingRight: '12px' }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="document-prototype-section-actions">
            {actions}
          </div>
        )}
      </div>
      <div className={bodyClassName}>
        {children}
      </div>
    </section>
  );
}
