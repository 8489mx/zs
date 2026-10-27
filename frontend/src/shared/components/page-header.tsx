import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateUiText } from '@/lib/auto-translator';
import { HrSectionNav } from '@/features/hr/components/HrSectionNav';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  actionText?: string;
  onActionClick?: () => void;
  className?: string;
  hideTitle?: boolean;
  onBack?: () => void;
  navigation?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  subtitle,
  badge,
  actions,
  actionText,
  onActionClick,
  className = '',
  hideTitle = false,
  onBack,
  navigation,
  children,
}: PageHeaderProps) {
  const { t: __t, i18n } = useTranslation();
  const { t } = useTranslation();
  const isEn = i18n.language === 'en';
  const resolvedDescription = description ?? subtitle;
  const displayTitle = typeof title === 'string' ? (isEn ? (translateUiText(title) || (t(title) !== title ? t(title) : title)) : title) : title;
  const displayDescription = typeof resolvedDescription === 'string' ? (isEn ? (translateUiText(resolvedDescription) || (t(resolvedDescription) !== resolvedDescription ? t(resolvedDescription) : resolvedDescription)) : resolvedDescription) : resolvedDescription;
  const resolvedActions = actions ?? (actionText && onActionClick ? (
    <button type="button" className="btn btn-primary" onClick={onActionClick}>
      {typeof actionText === 'string' ? t(actionText, actionText) : actionText}
    </button>
  ) : null);
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
                  aria-label={__t('shared.page_header.s0', "العودة")}
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
              <h1 
                className="page-header-title" 
                title={typeof title === 'string' ? title : undefined}
                style={{ 
                  margin: 0, 
                  lineHeight: 1.35, 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  minWidth: 0,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingBottom: '3px',
                  paddingTop: '1px',
                  boxSizing: 'border-box',
                  fontSize: typeof title === 'string' && title.length > 40 
                    ? '1.02rem' 
                    : typeof title === 'string' && title.length > 25 
                    ? '1.1rem' 
                    : undefined,
                }}
              >
                {displayTitle}
              </h1>
              {badge ? <div className="page-header-badge" style={{ display: 'inline-flex', alignItems: 'center' }}>{badge}</div> : null}
            </div>
          )}
          {displayDescription ? <div className="page-header-description text-muted" style={{ fontSize: '0.8rem' }}>{displayDescription}</div> : null}
        </div>
        {resolvedActions ? <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>{resolvedActions}</div> : null}
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
