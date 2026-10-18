import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { translateUiText } from '@/lib/auto-translator';

interface CardProps {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
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

export function Card({ title, description, actions, className = '', style, children }: PropsWithChildren<CardProps>) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const displayTitle = typeof title === 'string' && isEn ? (translateUiText(title) || title) : title;
  const displayDescription = typeof description === 'string' && isEn ? (translateUiText(description) || description) : description;
  const isReportSectionCard = className.split(/s+/).includes('hr-report-section-card');

  return (
    <section className={`card ${className}`.trim()} style={style}>
      {(displayTitle || displayDescription || actions) && (
        <div className="section-title">
          <div className="section-heading-copy">
            {displayTitle ? <h3 style={isReportSectionCard ? reportSectionTitleStyle : undefined}>{displayTitle}</h3> : null}
            {displayDescription ? <p className="section-description">{displayDescription}</p> : null}
          </div>
          {actions ? <div className="section-title-actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
