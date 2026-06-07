import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/shared/api/auth';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { useAuthStore } from '@/stores/auth-store';

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="3.6" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
      <circle cx="9" cy="6" r="1.8" />
      <circle cx="15" cy="12" r="1.8" />
      <circle cx="12" cy="18" r="1.8" />
    </svg>
  );
}

function PortalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 9.5V5.8A1.8 1.8 0 0 1 6.8 4h3.7" />
      <path d="M14 4h3.2A1.8 1.8 0 0 1 19 5.8V9" />
      <path d="M19 14.5v3.7A1.8 1.8 0 0 1 17.2 20h-3.7" />
      <path d="M10 20H6.8A1.8 1.8 0 0 1 5 18.2V15" />
      <path d="M9 15 15 9" />
      <path d="M11.5 9H15V12.5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 5.5H6.8A2.3 2.3 0 0 0 4.5 7.8v8.4a2.3 2.3 0 0 0 2.3 2.3H10" />
      <path d="M13.2 8.8 17.5 12l-4.3 3.2" />
      <path d="M17.5 12H9.7" />
    </svg>
  );
}

function getInitial(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'م';
  return Array.from(trimmed)[0] || 'م';
}

function resolveRoleLabel(role?: string | null) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'مدير النظام';
    case 'cashier':
      return 'أمين الصندوق';
    default:
      return 'مدير النظام';
  }
}

function resolveThemeClass(theme: string, isPrototypeDark: boolean) {
  return theme === 'dark' || isPrototypeDark ? 'is-dark' : 'is-light';
}

export function AppAccountMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const appTheme = useAuthStore((state) => state.theme);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isOpen, setIsOpen] = useState(false);
  const [isPrototypeDark, setIsPrototypeDark] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => user?.displayName || user?.username || 'محمود', [user]);
  const email = useMemo(() => user?.username || 'user@example.com', [user]);
  const roleLabel = useMemo(() => resolveRoleLabel(user?.role), [user?.role]);
  const avatarInitial = useMemo(() => getInitial(displayName), [displayName]);
  const themeClass = resolveThemeClass(appTheme, isPrototypeDark);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const updatePrototypeTheme = () => {
      const prototypeRoot = document.querySelector('.purchase-new-prototype.purchase-prototype-dark');
      const shellDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsPrototypeDark(shellDark || Boolean(prototypeRoot) || window.localStorage.getItem('z-erp-prototype-theme') === 'dark');
    };

    updatePrototypeTheme();

    const observer = new MutationObserver(updatePrototypeTheme);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });

    window.addEventListener('storage', updatePrototypeTheme);
    window.addEventListener('app-account-menu-open', updatePrototypeTheme as EventListener);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updatePrototypeTheme);
      window.removeEventListener('app-account-menu-open', updatePrototypeTheme as EventListener);
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen((current) => !current);

    window.addEventListener('app-account-menu-open', handleOpen as EventListener);
    window.addEventListener('app-account-menu-close', handleClose as EventListener);
    window.addEventListener('app-account-menu-toggle', handleToggle as EventListener);

    return () => {
      window.removeEventListener('app-account-menu-open', handleOpen as EventListener);
      window.removeEventListener('app-account-menu-close', handleClose as EventListener);
      window.removeEventListener('app-account-menu-toggle', handleToggle as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

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

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      await resetAuthenticatedClient(queryClient, clearSession);
      setIsOpen(false);
      navigate('/login?reason=signed-out', { replace: true });
    }
  }

  return (
    <div className={`app-account-menu ${themeClass}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="app-account-menu-trigger"
        aria-label="قائمة الحساب"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="app-account-menu-panel"
        title="قائمة الحساب"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="app-account-menu-avatar" aria-hidden="true">{avatarInitial}</span>
      </button>

      {isOpen ? (
        <div
          id="app-account-menu-panel"
          className="app-account-menu-panel"
          role="menu"
          aria-label="قائمة الحساب"
          ref={menuRef}
        >
          <div className="app-account-menu-identity">
            <div className="app-account-menu-identity-avatar" aria-hidden="true">{avatarInitial}</div>
            <div className="app-account-menu-identity-copy">
              <strong>{displayName}</strong>
              <span>{email}</span>
              <small>{roleLabel}</small>
            </div>
          </div>

          <div className="app-account-menu-divider" aria-hidden="true" />

          <div className="app-account-menu-items">
            <Link className="app-account-menu-item" role="menuitem" to="/profile" onClick={() => setIsOpen(false)}>
              <span className="app-account-menu-item-icon" aria-hidden="true"><UserIcon /></span>
              <span>الملف الشخصي</span>
            </Link>

            <Link className="app-account-menu-item" role="menuitem" to="/settings/overview" onClick={() => setIsOpen(false)}>
              <span className="app-account-menu-item-icon" aria-hidden="true"><SlidersIcon /></span>
              <span>الإعدادات</span>
            </Link>

            <button
              type="button"
              className="app-account-menu-item"
              role="menuitem"
              aria-disabled="true"
              disabled
              title="قريبًا"
            >
              <span className="app-account-menu-item-icon" aria-hidden="true"><PortalIcon /></span>
              <span>بوابتي</span>
              <span className="app-account-menu-item-badge">قريبًا</span>
            </button>

            <button
              type="button"
              className="app-account-menu-item app-account-menu-item-danger"
              role="menuitem"
              onClick={() => void handleLogout()}
            >
              <span className="app-account-menu-item-icon" aria-hidden="true"><LogoutIcon /></span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
