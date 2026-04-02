import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function Card({ title, description, actions, className = '', children }: PropsWithChildren<CardProps>) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="section-title">
          <div className="section-heading-copy">
            {title ? <h3>{title}</h3> : null}
            {description ? <p className="section-description">{description}</p> : null}
          </div>
          {actions ? <div className="section-title-actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
