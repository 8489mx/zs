import { CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const managerActions = useManagerActions(20);
  const importantActions = importantManagerActions(managerActions.data?.insights || []);
  const badgeCount = importantActions.length;
  const compactCount = 5;
  const shouldShowExpand = badgeCount > compactCount;
  const visibleAlerts = showAllAlerts ? importantActions : importantActions.slice(0, compactCount);

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
      visibility: 'visible',
    });
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setShowAllAlerts(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
        setShowAllAlerts(false);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowAllAlerts(false);
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

  const handleCenterAction = () => {
    setIsOpen(false);
    setShowAllAlerts(false);

    const scrollToDecisionCenter = () => {
      const target = document.getElementById('manager-decision-center');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (location.pathname !== '/') {
      navigate('/#manager-decision-center');
      window.setTimeout(scrollToDecisionCenter, 150);
      return;
    }

    if (location.hash !== '#manager-decision-center') {
      navigate('/#manager-decision-center', { replace: true });
    }
    window.setTimeout(scrollToDecisionCenter, 50);
  };

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
        <span>{badgeCount ? `${badgeCount} تنبيه يحتاج مراجعة` : 'لا توجد تنبيهات مهمة'}</span>
      </div>

      {visibleAlerts.length ? (
        <div className="manager-notifications-list" data-expanded={showAllAlerts ? 'true' : 'false'}>
          {visibleAlerts.map((alert) => (
            <Link
              className={`manager-notification-row ${managerActionSeverityClasses[alert.severity]}`}
              key={alert.id}
              to={alert.actionHref}
              onClick={() => {
                setIsOpen(false);
                setShowAllAlerts(false);
              }}
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
          <span>ستظهر هنا التنبيهات العاجلة عند وجودها.</span>
        </div>
      )}

      <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {shouldShowExpand ? (
          <button
            type="button"
            className="manager-notifications-more"
            style={{ marginTop: 0 }}
            onClick={() => setShowAllAlerts((current) => !current)}
          >
            {showAllAlerts ? 'عرض أقل' : `عرض كل التنبيهات (${badgeCount})`}
          </button>
        ) : null}

        {!showAllAlerts && shouldShowExpand ? (
          <div className="manager-notifications-hint" style={{ margin: 0 }}>يتم عرض أهم {compactCount} تنبيهات من {badgeCount}</div>
        ) : null}

        <button type="button" className="manager-notifications-center-link" style={{ marginTop: 0 }} onClick={handleCenterAction}>
          عرض مركز القرارات
        </button>
      </div>
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
