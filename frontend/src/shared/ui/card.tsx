import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

const reportSectionTitleStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(239, 246, 255, 0.96)',
  border: '1px solid rgba(37, 99, 235, 0.22)',
  borderRadius: 8,
  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.08)',
  color: 'rgb(30, 64, 175)',
  display: 'inline-flex',
  fontSize: '0.98rem',
  fontWeight: 800,
  justifyContent: 'center',
  lineHeight: 1.65,
  marginBottom: 2,
  padding: '5px 14px',
  width: 'fit-content',
};

export function Card({ title, description, actions, className = '', children }: PropsWithChildren<CardProps>) {
  const isReportSectionCard = className.split(/\s+/).includes('hr-report-section-card');

  return (
    <section className={`card ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="section-title">
          <div className="section-heading-copy">
            {title ? <h3 style={isReportSectionCard ? reportSectionTitleStyle : undefined}>{title}</h3> : null}
            {description ? <p className="section-description">{description}</p> : null}
          </div>
          {actions ? <div className="section-title-actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
