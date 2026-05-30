import { CSSProperties, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { authApi } from '@/shared/api/auth';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { DEFAULT_STORE_NAME, useAuthStore } from '@/stores/auth-store';
import { navigationItems } from '@/app/router/registry';
import { canAccessNavigationItem } from '@/app/router/access';
import { PasswordRotationGate } from '@/shared/system/password-rotation-gate';
import { SystemStatusBanner } from '@/shared/system/system-status-banner';
import { BootstrapAdminBanner } from '@/shared/system/bootstrap-admin-banner';
import { TrialStatusBanner } from '@/shared/system/trial-status-banner';
import {
  POS_SHELL_VISIBILITY_KEY,
  POS_TOGGLE_CHROME_EVENT,
  POS_TOGGLE_FULLSCREEN_EVENT,
  readPosShellPreference,
} from '@/features/pos/lib/pos-shell';
import { QuickAttendanceShortcut } from '@/shared/layout/quick-attendance-shortcut';

type SidebarGroupDefinition = {
  key: string;
  label: string;
  itemKeys: string[];
};

type IconTone = {
  bg: string;
  border: string;
  fg: string;
  glow: string;
};

const iconToneMap: Record<string, IconTone> = {
  dashboard: { bg: 'linear-gradient(135deg, #ede9fe, #dbeafe)', border: '#c4b5fd', fg: '#5b21b6', glow: 'rgba(99, 102, 241, 0.22)' },
  products: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#166534', glow: 'rgba(34, 197, 94, 0.22)' },
  sales: { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: '#93c5fd', fg: '#1d4ed8', glow: 'rgba(37, 99, 235, 0.22)' },
  pos: { bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', border: '#d8b4fe', fg: '#7e22ce', glow: 'rgba(168, 85, 247, 0.22)' },
  'cash-drawer': { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#fbbf24', fg: '#a16207', glow: 'rgba(245, 158, 11, 0.24)' },
  purchases: { bg: 'linear-gradient(135deg, #cffafe, #a5f3fc)', border: '#67e8f9', fg: '#0f766e', glow: 'rgba(6, 182, 212, 0.22)' },
  inventory: { bg: 'linear-gradient(135deg, #ccfbf1, #99f6e4)', border: '#5eead4', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.22)' },
  suppliers: { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#cbd5e1', fg: '#334155', glow: 'rgba(100, 116, 139, 0.18)' },
  customers: { bg: 'linear-gradient(135deg, #ffe4e6, #fecdd3)', border: '#fda4af', fg: '#be123c', glow: 'rgba(244, 63, 94, 0.2)' },
  accounts: { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  returns: { bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', border: '#fdba74', fg: '#c2410c', glow: 'rgba(249, 115, 22, 0.22)' },
  reports: { bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', border: '#a5b4fc', fg: '#4338ca', glow: 'rgba(99, 102, 241, 0.2)' },
  audit: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#15803d', glow: 'rgba(34, 197, 94, 0.2)' },
  treasury: { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '#6ee7b7', fg: '#047857', glow: 'rgba(16, 185, 129, 0.22)' },
  services: { bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', border: '#c4b5fd', fg: '#6d28d9', glow: 'rgba(124, 58, 237, 0.22)' },
  hr: { bg: 'linear-gradient(135deg, #fee2e2, #e0f2fe)', border: '#fca5a5', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.2)' },
  'pricing-center': { bg: 'linear-gradient(135deg, #fef9c3, #fde68a)', border: '#facc15', fg: '#a16207', glow: 'rgba(234, 179, 8, 0.24)' },
  settings: { bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', border: '#cbd5e1', fg: '#475569', glow: 'rgba(71, 85, 105, 0.18)' },
  'accounting-accounts': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-journal-entries': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-settings': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-financial-summary': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-receivables-payables': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-cash-movement': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-inventory-value': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
};

const iconPathMap: Record<string, string> = {
  dashboard: 'M4 11h16M6 9l6-5 6 5v10H6V9z',
  pos: 'M4 5h16v10H4V5zM8 19h8M10 15v4M14 15v4',
  'cash-drawer': 'M5 8h14l1 5H4l1-5zM4 13h16v6H4v-6zM8 16h8',
  sales: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h4',
  returns: 'M8 7h8a5 5 0 1 1 0 10h-6M8 7l4-4M8 7l4 4',
  customers: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 5 5',
  reports: 'M5 19V5h14v14H5zM9 16v-5M12 16V8M15 16v-3',
  purchases: 'M6 7h15l-2 8H8L6 3H3M9 20h.01M18 20h.01',
  suppliers: 'M3 7h11v10H3V7zM14 10h4l3 3v4h-7v-7zM7 20h.01M18 20h.01',
  inventory: 'M12 3 4 7l8 4 8-4-8-4zM4 11l8 4 8-4M4 15l8 4 8-4',
  products: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  treasury: 'M4 7h16v10H4V7zM7 10h2M15 14h2M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  services: 'M6 4h12v16H6V4zM9 8h6M9 12h6M9 16h3',
  accounts: 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'pricing-center': 'M20 12V5h-7L4 14l6 6 10-8zM16 8h.01',
  hr: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  audit: 'M5 4h14v16H5V4zM9 8h6M9 12h6M9 16h4',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.4-1.4M5.6 18.4 7 17M17 17l1.4 1.4M5.6 5.6 7 7',
  'accounting-accounts': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-journal-entries': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-settings': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-financial-summary': 'M5 19V5h14v14H5zM9 16v-5M12 16V8M15 16v-3',
  'accounting-cash-movement': 'M4 12h16M7 8h10M7 16h10M12 5v14',
  'accounting-inventory-value': 'M12 3 4 7l8 4 8-4-8-4zM4 11l8 4 8-4M4 15l8 4 8-4',
};

function AppNavIcon({ itemKey }: { itemKey: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPathMap[itemKey] || iconPathMap.settings} />
    </svg>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const storeName = useAuthStore((state) => state.storeName);
  const clearSession = useAuthStore((state) => state.clearSession);
  const displayName = user?.displayName || user?.username || 'المستخدم';
  const workspaceName = storeName || DEFAULT_STORE_NAME;
  const isPosRoute = location.pathname.startsWith('/pos');
  const [isPosChromeHidden, setIsPosChromeHidden] = useState(false);
  const [expandedSidebarGroupKey, setExpandedSidebarGroupKey] = useState<string | null>(null);
  const [quickAttendanceOpen, setQuickAttendanceOpen] = useState(false);

  const visibleNavigationItems = useMemo(() => {
    const preferredOrder = ['dashboard', 'pos', 'cash-drawer', 'sales', 'purchases', 'returns', 'accounts', 'accounting-accounts', 'accounting-journal-entries', 'accounting-settings', 'treasury', 'services', 'hr', 'audit', 'inventory', 'products', 'pricing-center', 'customers', 'suppliers', 'reports', 'settings'];
    const labelOverrides: Record<string, string> = {
      dashboard: 'الرئيسية',
      pos: 'نقطة البيع',
      sales: 'سجل الفواتير',
      'cash-drawer': 'وردية نقطة البيع',
      accounts: 'حسابات العملاء والموردين',
      'accounting-accounts': 'شجرة الحسابات',
      'accounting-journal-entries': 'القيود اليومية',
      'accounting-financial-summary': 'الملخص المالي',
      'accounting-receivables-payables': 'الذمم والمستحقات',
      'accounting-cash-movement': 'حركة الخزنة والبنك',
      'accounting-inventory-value': 'قيمة المخزون',
      'accounting-settings': 'إعدادات الحسابات',
      treasury: 'الخزينة',
      services: 'الخدمات',
      hr: 'الموارد البشرية',
      audit: 'سجل النشاط',
    };
    return navigationItems
      .filter((item) => user && canAccessNavigationItem(user, item))
      .map((item) => ({ ...item, label: labelOverrides[item.key] || item.label }))
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.key);
        const bIndex = preferredOrder.indexOf(b.key);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
  }, [user]);

  const navigationMap = useMemo(() => new Map(visibleNavigationItems.map((item) => [item.key, item])), [visibleNavigationItems]);
  const primaryNavigationKeys = useMemo(() => ['dashboard', 'pos', 'cash-drawer'], []);
  const sidebarGroups = useMemo<SidebarGroupDefinition[]>(() => ([
    { key: 'sales-group', label: 'المبيعات', itemKeys: ['sales', 'returns', 'customers', 'reports'] },
    { key: 'purchases-group', label: 'المشتريات والموردين', itemKeys: ['purchases', 'suppliers'] },
    { key: 'inventory-group', label: 'المخزون والأصناف', itemKeys: ['inventory', 'products', 'treasury'] },
    { key: 'services-group', label: 'الخدمات والحسابات', itemKeys: ['services', 'accounts', 'accounting-accounts', 'accounting-journal-entries', 'accounting-settings', 'pricing-center'] },
    { key: 'admin-group', label: 'الإدارة', itemKeys: ['hr', 'audit', 'settings'] },
  ]), []);

  const visiblePrimaryNavigationItems = useMemo(() => primaryNavigationKeys.map((key) => navigationMap.get(key)).filter((item): item is NonNullable<typeof item> => Boolean(item)), [navigationMap, primaryNavigationKeys]);
  const activeSidebarGroupKey = useMemo(() => sidebarGroups.find((group) => group.itemKeys.some((itemKey) => {
    const navItem = navigationMap.get(itemKey);
    if (!navItem) return false;
    if (navItem.end) return location.pathname === navItem.to;
    return location.pathname === navItem.to || location.pathname.startsWith(`${navItem.to}/`);
  }))?.key ?? null, [location.pathname, navigationMap, sidebarGroups]);

  useEffect(() => { setExpandedSidebarGroupKey(activeSidebarGroupKey); }, [activeSidebarGroupKey]);

  useEffect(() => {
    if (!isPosRoute) {
      setIsPosChromeHidden(false);
      return;
    }
    setIsPosChromeHidden(readPosShellPreference());
  }, [isPosRoute]);

  useEffect(() => {
    if (!isPosRoute || typeof window === 'undefined') return;
    window.localStorage.setItem(POS_SHELL_VISIBILITY_KEY, isPosChromeHidden ? 'hidden' : 'shown');
  }, [isPosChromeHidden, isPosRoute]);

  useEffect(() => {
    if (!isPosRoute || typeof window === 'undefined') return undefined;
    const toggleChrome = () => setIsPosChromeHidden((current) => !current);
    const toggleFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.();
          setIsPosChromeHidden(true);
          return;
        }
        await document.exitFullscreen?.();
        setIsPosChromeHidden(false);
      } catch {
        // ignore fullscreen errors triggered by browser policies
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'F10') {
        event.preventDefault();
        toggleChrome();
        return;
      }
      if (event.key === 'F11') {
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsPosChromeHidden(true);
        return;
      }
      setIsPosChromeHidden(readPosShellPreference());
    };
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener(POS_TOGGLE_CHROME_EVENT, toggleChrome);
    window.addEventListener(POS_TOGGLE_FULLSCREEN_EVENT, toggleFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener(POS_TOGGLE_CHROME_EVENT, toggleChrome);
      window.removeEventListener(POS_TOGGLE_FULLSCREEN_EVENT, toggleFullscreen);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isPosRoute]);

  useEffect(() => {
    const resetScroll = () => {
      const contentWrap = document.querySelector('.content-wrap') as HTMLElement | null;
      const pageStack = document.querySelector('.content-wrap .page-stack') as HTMLElement | null;
      if (contentWrap) contentWrap.scrollTop = 0;
      if (pageStack) pageStack.scrollTop = 0;
      window.scrollTo(0, 0);
    };
    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
    };
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!event.altKey || !event.shiftKey || event.key !== 'F9') return;
      event.preventDefault();
      setQuickAttendanceOpen(true);
    };
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      await resetAuthenticatedClient(queryClient, clearSession);
      navigate('/login?reason=signed-out', { replace: true });
    }
  }

  const cleanWorkspaceName = workspaceName.replace(/^\s*["'”“]+|["'”“]+\s*$/g, '').trim() || workspaceName;

  function renderNavItem(item: NonNullable<(typeof visibleNavigationItems)[number]>, keyPrefix: string) {
    const tone = iconToneMap[item.key] || iconToneMap.settings;
    const toneStyle = { '--icon-bg': tone.bg, '--icon-border': tone.border, '--icon-fg': tone.fg, '--icon-glow': tone.glow } as CSSProperties;
    return (
      <NavLink key={`${keyPrefix}-${item.key}`} to={item.to} end={item.end} data-key={item.key} style={toneStyle} className={({ isActive }) => `sidebar-link ${keyPrefix === 'group' ? 'sidebar-link-sub ' : ''}${isActive ? 'active' : ''}`.trim()}>
        <span className="sidebar-icon"><AppNavIcon itemKey={item.key} /></span>
        <span className="sidebar-label">{item.label}</span>
        <span className="sidebar-link-chevron-spacer" aria-hidden="true" />
      </NavLink>
    );
  }

  return (
    <div className={`app-layout ${isPosRoute && isPosChromeHidden ? 'app-layout-pos-focus' : ''}`.trim()}>
      {!isPosRoute || !isPosChromeHidden ? (
        <aside className="sidebar-fixed">
          <div className="brand">
            <div className="brand-copy">
              <div className="brand-title">{cleanWorkspaceName}</div>
              <div className="brand-sub">منصة Z Systems</div>
              <div className="brand-sub muted">لإدارة المبيعات والمخزون</div>
            </div>
            <div className="brand-logo"><span className="z-mark">Z</span><span className="systems-mark">Systems</span></div>
          </div>
          <nav className="sidebar-nav">
            {visiblePrimaryNavigationItems.map((item) => renderNavItem(item, 'primary'))}
            {sidebarGroups.map((group) => {
              const groupItems = group.itemKeys.map((key) => navigationMap.get(key)).filter((item): item is NonNullable<typeof item> => Boolean(item));
              if (!groupItems.length) return null;
              const isOpen = expandedSidebarGroupKey === group.key;
              const isActive = activeSidebarGroupKey === group.key;
              const groupIconItemKey = groupItems[0]?.key || 'settings';
              const tone = iconToneMap[groupIconItemKey] || iconToneMap.settings;
              const toneStyle = { '--icon-bg': tone.bg, '--icon-border': tone.border, '--icon-fg': tone.fg, '--icon-glow': tone.glow } as CSSProperties;
              return (
                <div key={group.key} className={`sidebar-group ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`.trim()}>
                  <button type="button" className="sidebar-group-trigger" aria-expanded={isOpen} onClick={() => setExpandedSidebarGroupKey((current) => current === group.key ? null : group.key)} style={toneStyle}>
                    <span className="sidebar-group-icon" aria-hidden="true"><AppNavIcon itemKey={groupIconItemKey} /></span>
                    <span className="sidebar-label">{group.label}</span>
                    <span className="sidebar-group-chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                  </button>
                  {isOpen ? <div className="sidebar-group-items">{groupItems.map((item) => renderNavItem(item, 'group'))}</div> : null}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="stack gap-8" style={{ marginBottom: 12 }}><div className="muted small">مرحبًا {displayName}</div></div>
            <Button variant="danger" onClick={handleLogout} className="full-width">تسجيل الخروج</Button>
          </div>
        </aside>
      ) : null}
      <div className={`content-wrap ${isPosRoute && isPosChromeHidden ? 'content-wrap-pos-focus' : ''}`.trim()}>
        <div className="stack gap-12" style={{ padding: '12px 16px 0' }}>
          <BootstrapAdminBanner />
          <TrialStatusBanner />
          <SystemStatusBanner />
        </div>
        <main className={`page-stack ${isPosRoute && isPosChromeHidden ? 'page-stack-pos-focus' : ''}`.trim()}>{children}</main>
      </div>
      <PasswordRotationGate />
      <QuickAttendanceShortcut open={quickAttendanceOpen} onClose={() => setQuickAttendanceOpen(false)} />
    </div>
  );
}

