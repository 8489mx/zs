import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  MonitorIcon, 
  CopyIcon, 
  XIcon, 
  RefreshCwIcon,
  LayersIcon 
} from '@/shared/components/icons/AppIcons';

export interface ContextMenuTarget {
  path: string;
  label: string;
  iconKey?: string;
  tabId?: string;
}

interface SidebarContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  target: ContextMenuTarget | null;
  mode?: 'sidebar' | 'tab';
  onClose: () => void;
  onOpenInNewTab?: (target: ContextMenuTarget) => void;
  onOpenInNewWindow?: (target: ContextMenuTarget) => void;
  onCopyLink?: (target: ContextMenuTarget) => void;
  onCloseTab?: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onReloadTab?: (target: ContextMenuTarget) => void;
}

export function SidebarContextMenu({
  isOpen,
  position,
  target,
  mode = 'sidebar',
  onClose,
  onOpenInNewTab,
  onOpenInNewWindow,
  onCopyLink,
  onCloseTab,
  onCloseOtherTabs,
  onReloadTab,
}: SidebarContextMenuProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleOutsideClick, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', onClose, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  // Viewport boundary protection
  const menuWidth = 210;
  const menuHeight = mode === 'tab' ? 190 : 140;
  const safeX = Math.max(10, Math.min(position.x, window.innerWidth - menuWidth - 14));
  const safeY = Math.max(10, Math.min(position.y, window.innerHeight - menuHeight - 14));

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#1e293b',
    textAlign: isRtl ? 'right' : 'left',
    direction: isRtl ? 'rtl' : 'ltr',
    transition: 'background-color 0.12s ease, color 0.12s ease',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = '#f1f5f9';
    e.currentTarget.style.color = '#170e5e';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = '#1e293b';
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('tabs.context_menu', 'قائمة سياقية للتبويبات')}
      style={{
        position: 'fixed',
        left: `${safeX}px`,
        top: `${safeY}px`,
        zIndex: 99999,
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
        padding: '6px',
        minWidth: `${menuWidth}px`,
        direction: isRtl ? 'rtl' : 'ltr',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          padding: '4px 10px 6px',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '4px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#64748b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '190px',
        }}
        title={t(target.label, target.label)}
      >
        {t(target.label, target.label)}
      </div>

      {mode === 'sidebar' && (
        <button
          type="button"
          style={menuItemStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            onClose();
            onOpenInNewTab?.(target);
          }}
        >
          <PlusIcon size={15} color="#2563eb" strokeWidth={2.4} />
          <span>{t('tabs.open_new_tab', 'فتح في تبويب جديد')}</span>
        </button>
      )}

      {mode === 'tab' && onReloadTab && (
        <button
          type="button"
          style={menuItemStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            onClose();
            onReloadTab(target);
          }}
        >
          <RefreshCwIcon size={14} color="#059669" strokeWidth={2.2} />
          <span>{t('tabs.reload', 'إعادة تحميل التبويب')}</span>
        </button>
      )}

      <button
        type="button"
        style={menuItemStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          onClose();
          onOpenInNewWindow?.(target);
        }}
      >
        <MonitorIcon size={15} color="#7c3aed" strokeWidth={2} />
        <span>{t('tabs.open_new_window', 'فتح في نافذة مستقلة')}</span>
      </button>

      <button
        type="button"
        style={menuItemStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          onClose();
          onCopyLink?.(target);
        }}
      >
        <CopyIcon size={14} color="#475569" strokeWidth={2} />
        <span>{t('tabs.copy_link', 'نسخ رابط الصفحة')}</span>
      </button>

      {mode === 'tab' && target.tabId && (
        <>
          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
          {onCloseTab && (
            <button
              type="button"
              style={{ ...menuItemStyle, color: '#dc2626' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
                e.currentTarget.style.color = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#dc2626';
              }}
              onClick={() => {
                onClose();
                onCloseTab(target.tabId!);
              }}
            >
              <XIcon size={14} color="#dc2626" strokeWidth={2.4} />
              <span>{t('tabs.close_this', 'إغلاق هذا التبويب')}</span>
            </button>
          )}
          {onCloseOtherTabs && (
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                onClose();
                onCloseOtherTabs(target.tabId!);
              }}
            >
              <LayersIcon size={14} color="#475569" strokeWidth={2} />
              <span>{t('tabs.close_others', 'إغلاق التبويبات الأخرى')}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
