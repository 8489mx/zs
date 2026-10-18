import { useTranslation } from 'react-i18next';
import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon, ArrowRightIcon } from '@/shared/components/icons/AppIcons';

export interface RestaurantOperationsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  onBack?: () => void;
  backText?: string;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  footerNote?: string;
  children: React.ReactNode;
  bodyStyle?: React.CSSProperties;
  bodyClassName?: string;
  scrollableBody?: boolean;
  zIndex?: number;
  ariaLabel?: string;
}

export function RestaurantOperationsDialog({
  open,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  onBack,
  backText = 'الرجوع لعمليات المطعم',
  headerActions,
  footerActions,
  footerNote,
  children,
  bodyStyle,
  bodyClassName,
  scrollableBody = true,
  zIndex = 10050,
  ariaLabel,
}: RestaurantOperationsDialogProps) {
  const { t } = useTranslation();
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      shellClassName="full-bleed pos-restaurant-unified-shell"
      ariaLabel={ariaLabel || title}
      zIndex={zIndex}
    >
      <div
        dir="rtl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '14px',
          overflow: 'hidden',
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Universal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '13px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
            gap: '12px',
          }}
        >
          {/* Title & Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {icon ? (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            ) : (
              <span
                style={{
                  width: '4px',
                  height: '18px',
                  backgroundColor: '#170e5e',
                  borderRadius: '2px',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                <h3
                  className="no-pseudo-bar"
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Action Controls & Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                  background: '#eef2ff',
                  color: '#170e5e',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e0e7ff';
                  e.currentTarget.style.borderColor = '#170e5e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#eef2ff';
                  e.currentTarget.style.borderColor = '#c7d2fe';
                }}
              >
                <ArrowRightIcon size={14} color="#170e5e" />
                <span>{backText}</span>
              </button>
            )}

            {headerActions}

            <button
              type="button"
              onClick={onClose}
              aria-label={t('pos.pos_workspace.restaurant_operations_dialog.s0', "إغلاق النافذة")}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Universal Body Container */}
        <div
          className={bodyClassName || (scrollableBody ? 'thin-scrollbar' : undefined)}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: scrollableBody ? 'auto' : 'hidden',
            overflowX: 'hidden',
            padding: '16px 20px',
            boxSizing: 'border-box',
            width: '100%',
            ...bodyStyle,
          }}
        >
          {children}
        </div>

        {/* Universal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            flexShrink: 0,
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#170e5e',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowRightIcon size={12} color="#170e5e" />
                <span>{backText}</span>
              </button>
            )}
            <span
              style={{
                fontSize: '11px',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {footerNote || t('pos.pos_workspace.restaurant_operations_dialog.s1', "نظام تشغيل المطاعم المتقدم · Z-Systems Restaurant Operations Hub")}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {footerActions}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '5px 16px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              {t('pos.pos_workspace.restaurant_operations_dialog.s2', "إغلاق")}
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
