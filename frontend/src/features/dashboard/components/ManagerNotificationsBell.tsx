import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useManagerActions } from '@/features/dashboard/hooks/useManagerActions';
import {
  importantManagerActions,
  managerActionSeverityClasses,
  managerActionSeverityLabels,
} from '@/features/dashboard/lib/manager-actions-ui';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8.8a6 6 0 0 0-12 0c0 7-2.5 7-2.5 7h17s-2.5 0-2.5-7" />
      <path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" />
    </svg>
  );
}

export function ManagerNotificationsBell() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const managerActions = useManagerActions(20);
  const importantActions = importantManagerActions(managerActions.data?.insights || []);
  const badgeCount = importantActions.length;
  const topAlerts = importantActions.slice(0, 5);

  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 16;
    const menuWidth = Math.min(360, window.innerWidth - (viewportPadding * 2));
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: menuWidth,
      zIndex: 1000,
    });
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  const menu = isOpen ? (
    <div
      className="manager-notifications-menu"
      role="dialog"
      aria-label="تنبيهات المدير"
      ref={menuRef}
      style={menuStyle}
    >
      <div className="manager-notifications-header">
        <strong>تنبيهات المدير</strong>
        <span>{badgeCount ? `${badgeCount} تحتاج مراجعة` : 'لا توجد تنبيهات مهمة'}</span>
      </div>

      {topAlerts.length ? (
        <div className="manager-notifications-list">
          {topAlerts.map((alert) => (
            <Link
              className={`manager-notification-row ${managerActionSeverityClasses[alert.severity]}`}
              key={alert.id}
              to={alert.actionHref}
            >
              <span>{managerActionSeverityLabels[alert.severity]}</span>
              <strong>{alert.title}</strong>
              <small>{alert.message}</small>
              <em>راجع الآن</em>
            </Link>
          ))}
        </div>
      ) : (
        <div className="manager-notifications-empty">
          <strong>لا توجد تنبيهات مهمة</strong>
          <span>سنظهر هنا التنبيهات العاجلة عند وجودها.</span>
        </div>
      )}

      <Link className="manager-notifications-center-link" to="/">
        عرض مركز القرارات
      </Link>
    </div>
  ) : null;

  return (
    <div className="manager-notifications" ref={rootRef}>
      <button
        type="button"
        className="manager-notifications-button"
        aria-label="تنبيهات المدير"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <BellIcon />
        {badgeCount ? <span className="manager-notifications-badge">{badgeCount}</span> : null}
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
