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
  'saas-admin-tenants': { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '#fca5a5', fg: '#991b1b', glow: 'rgba(239, 68, 68, 0.2)' },
  'accounting-accounts': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-journal-entries': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-settings': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-financial-summary': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-receivables-payables': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-inventory-value': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'manufacturing-boms': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  'manufacturing-work-orders': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  'manufacturing-settings': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
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
  'saas-admin-tenants': 'M4 5h16v14H4V5zM8 9h8M8 13h8M8 17h5',
  'accounting-accounts': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-journal-entries': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-settings': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-financial-summary': 'M5 19V5h14v14H5zM9 16v-5M12 16V8M15 16v-3',
  'accounting-inventory-value': 'M12 3 4 7l8 4 8-4-8-4zM4 11l8 4 8-4M4 15l8 4 8-4',
  'manufacturing-boms': 'M4 6h16M4 12h16M4 18h16',
  'manufacturing-work-orders': 'M2 12h4l2-2h4l2 2h8M6 14v6M18 14v6M10 6L8 10h8l-2-4h-4z',
  'manufacturing-settings': 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.4-1.4M5.6 18.4 7 17M17 17l1.4 1.4M5.6 5.6 7 7',
};

function AppNavIcon({ itemKey }: { itemKey: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPathMap[itemKey] || iconPathMap.settings} />
    </svg>
  );
}


const shellTranslations = {
  ar: {
    dashboard: 'الرئيسية',
    'cash-drawer': 'الورديات والدرج النقدي',
    pos: 'نقطة البيع',
    sales: 'سجل الفواتير',
    returns: 'مرتجعات المبيعات',
    customers: 'العملاء',
    reports: 'التقارير',
    purchases: 'المشتريات',
    suppliers: 'الموردين',
    inventory: 'المخزون',
    products: 'المنتجات',
    treasury: 'الخزينة',
    services: 'الخدمات',
    accounts: 'حسابات العملاء والموردين',
    'accounting-accounts': 'شجرة الحسابات',
    'accounting-journal-entries': 'القيود اليومية',
    'accounting-settings': 'إعدادات الحسابات',
    'pricing-center': 'مركز التسعير',
    hr: 'الموارد البشرية',
    audit: 'سجل النشاط',
    'saas-admin-tenants': 'إدارة النسخ',
    settings: 'الإعدادات',
    'sales-group': 'المبيعات',
    'purchases-group': 'المشتريات والموردين',
    'inventory-group': 'المخزون والأصناف',
    'services-group': 'الخدمات والحسابات',
    'admin-group': 'الإدارة',
    'manufacturing-group': 'التصنيع والإنتاج',
    'manufacturing-components': 'مكونات التصنيع',
    'manufacturing-boms': 'قوائم المكونات',
    'manufacturing-work-orders': 'أوامر الإنتاج',
    'manufacturing-settings': 'إعدادات التصنيع',
    'platform_sub': 'منصة Z Systems',
    'platform_desc': 'لإدارة المبيعات والمخزون',
    'logout': 'تسجيل الخروج',
    'welcome_msg': 'مرحبًا',
    'expand_menu': 'توسيع القائمة',
    'collapse_menu': 'طي القائمة',
  },
  en: {
    dashboard: 'Dashboard',
    'cash-drawer': 'Cash Drawer / Shifts',
    pos: 'Point of Sale',
    sales: 'Sales History',
    returns: 'Sales Returns',
    customers: 'Customers',
    reports: 'Reports',
    purchases: 'Purchases',
    suppliers: 'Suppliers',
    inventory: 'Inventory',
    products: 'Products',
    treasury: 'Treasury',
    services: 'Services',
    accounts: 'Customers & Suppliers',
    'accounting-accounts': 'Chart of Accounts',
    'accounting-journal-entries': 'Journal Entries',
    'accounting-settings': 'Accounting Settings',
    'pricing-center': 'Pricing Center',
    hr: 'Human Resources',
    audit: 'Activity Log',
    'saas-admin-tenants': 'Tenants Management',
    settings: 'Settings',
    'sales-group': 'Sales',
    'purchases-group': 'Purchases & Suppliers',
    'inventory-group': 'Inventory & Items',
    'services-group': 'Services & Accounts',
    'admin-group': 'Administration',
    'manufacturing-group': 'Manufacturing & Production',
    'manufacturing-components': 'Manufacturing Components',
    'manufacturing-boms': 'Bill of Materials',
    'manufacturing-work-orders': 'Work Orders',
    'manufacturing-settings': 'Manufacturing Settings',
    'platform_sub': 'Z Systems Platform',
    'platform_desc': 'Sales and Inventory Management',
    'logout': 'Logout',
    'welcome_msg': 'Welcome',
    'expand_menu': 'Expand Menu',
    'collapse_menu': 'Collapse Menu',
  }
};

export function AppShell({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const storeName = useAuthStore((state) => state.storeName);
  const clearSession = useAuthStore((state) => state.clearSession);
  const language = useAuthStore((state) => state.language || 'ar');
  const t = (key: keyof typeof shellTranslations.ar) => shellTranslations[language][key] || key;
  const displayName = user?.displayName || user?.username || 'المستخدم';
  const workspaceName = storeName || DEFAULT_STORE_NAME;
  const isPosRoute = location.pathname.startsWith('/pos');
  const [isPosChromeHidden, setIsPosChromeHidden] = useState(false);
  const [quickAttendanceOpen, setQuickAttendanceOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.localStorage.getItem('zsystems_sidebar_collapsed') === 'true';
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('zsystems_sidebar_collapsed', String(next));
      return next;
    });
  };

  const visibleNavigationItems = useMemo(() => {
    const preferredOrder = ['dashboard', 'pos', 'cash-drawer', 'sales', 'purchases', 'returns', 'accounts', 'accounting-accounts', 'accounting-journal-entries', 'accounting-settings', 'treasury', 'services', 'hr', 'audit', 'saas-admin-tenants', 'inventory', 'products', 'manufacturing-boms', 'manufacturing-work-orders', 'manufacturing-settings', 'pricing-center', 'customers', 'suppliers', 'reports', 'settings'];
    const labelOverrides: Record<string, string> = {
      dashboard: t('dashboard'),
      'cash-drawer': t('cash-drawer'),
      pos: t('pos'),
      sales: t('sales'),
      returns: t('returns'),
      customers: t('customers'),
      reports: t('reports'),
      purchases: t('purchases'),
      suppliers: t('suppliers'),
      inventory: t('inventory'),
      products: t('products'),
      treasury: t('treasury'),
      services: t('services'),
      accounts: t('accounts'),
      'accounting-accounts': t('accounting-accounts'),
      'accounting-journal-entries': t('accounting-journal-entries'),
      'accounting-settings': t('accounting-settings'),
      'pricing-center': t('pricing-center'),
      hr: t('hr'),
      audit: t('audit'),
      'saas-admin-tenants': t('saas-admin-tenants'),
      settings: t('settings'),
      'manufacturing-boms': t('manufacturing-boms'),
      'manufacturing-work-orders': t('manufacturing-work-orders'),
      'manufacturing-settings': t('manufacturing-settings'),
      'manufacturing-components': t('manufacturing-components'),
    };
    return navigationItems
      .filter((item) => user && canAccessNavigationItem(user, item))
      .map((item) => ({ ...item, label: labelOverrides[item.key] || item.label }))
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.key);
        const bIndex = preferredOrder.indexOf(b.key);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
  }, [user, language]);

  const navigationMap = useMemo(() => new Map(visibleNavigationItems.map((item) => [item.key, item])), [visibleNavigationItems]);
  const primaryNavigationKeys = useMemo(() => ['dashboard', 'pos', 'cash-drawer'], []);
  const sidebarGroups = useMemo<SidebarGroupDefinition[]>(() => ([
    { key: 'sales-group', label: t('sales-group'), itemKeys: ['sales', 'returns', 'customers', 'reports'] },
    { key: 'purchases-group', label: t('purchases-group'), itemKeys: ['purchases', 'suppliers'] },
    { key: 'inventory-group', label: t('inventory-group'), itemKeys: ['inventory', 'products', 'treasury'] },
    { key: 'manufacturing-group', label: t('manufacturing-group'), itemKeys: ['manufacturing-components', 'manufacturing-work-orders', 'manufacturing-boms', 'manufacturing-settings'] },
    { key: 'services-group', label: t('services-group'), itemKeys: ['services', 'accounts', 'accounting-accounts', 'accounting-journal-entries', 'accounting-settings', 'pricing-center'] },
    { key: 'admin-group', label: t('admin-group'), itemKeys: ['hr', 'audit', 'saas-admin-tenants', 'settings'] },
  ]), [language]);

  const visiblePrimaryNavigationItems = useMemo(() => primaryNavigationKeys.map((key) => navigationMap.get(key)).filter((item): item is NonNullable<typeof item> => Boolean(item)), [navigationMap, primaryNavigationKeys]);
  const activeSidebarGroupKey = useMemo(() => sidebarGroups.find((group) => group.itemKeys.some((itemKey) => {
    const navItem = navigationMap.get(itemKey);
    if (!navItem) return false;
    if (navItem.end) return location.pathname === navItem.to;
    return location.pathname === navItem.to || location.pathname.startsWith(`${navItem.to}/`);
  }))?.key ?? null, [location.pathname, navigationMap, sidebarGroups]);

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
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isPosRoute && isPosChromeHidden ? 'app-layout-pos-focus' : ''}`.trim()}>
      {!isPosRoute || !isPosChromeHidden ? (
        <aside className="sidebar-fixed">
          <div className="brand">
            <div className="brand-copy">
              <div className="brand-title">{cleanWorkspaceName}</div>
              <div className="brand-sub">{t("platform_sub")}</div>
              <div className="brand-sub muted">{t("platform_desc")}</div>
            </div>
            <div className="brand-logo"><span className="z-mark">Z</span><span className="systems-mark">Systems</span></div>
          </div>
          <nav className="sidebar-nav">
            {visiblePrimaryNavigationItems.map((item) => renderNavItem(item, 'primary'))}
            {sidebarGroups.map((group) => {
              const groupItems = group.itemKeys.map((key) => navigationMap.get(key)).filter((item): item is NonNullable<typeof item> => Boolean(item));
              if (!groupItems.length) return null;
              const isActive = activeSidebarGroupKey === group.key;
              const groupIconItemKey = groupItems[0]?.key || 'settings';
              const tone = iconToneMap[groupIconItemKey] || iconToneMap.settings;
              const toneStyle = { '--icon-bg': tone.bg, '--icon-border': tone.border, '--icon-fg': tone.fg, '--icon-glow': tone.glow } as CSSProperties;
              return (
                <div key={group.key} className={`sidebar-group ${isActive ? 'is-active' : ''} ${!isSidebarCollapsed ? 'is-open' : ''}`.trim()}>
                  <div 
                    className="sidebar-group-trigger" 
                    style={toneStyle}
                    onClick={() => {
                      if (isSidebarCollapsed) toggleSidebar();
                    }}
                    role={isSidebarCollapsed ? 'button' : undefined}
                    tabIndex={isSidebarCollapsed ? 0 : undefined}
                  >
                    <span className="sidebar-group-icon" aria-hidden="true"><AppNavIcon itemKey={groupIconItemKey} /></span>
                    <span className="sidebar-label">{group.label}</span>
                  </div>
                  {!isSidebarCollapsed ? <div className="sidebar-group-items">{groupItems.map((item) => renderNavItem(item, 'group'))}</div> : null}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-footer-info" style={{ marginBottom: 12 }}>
              <div className="muted small">{t("welcome_msg")} {displayName}</div>
            </div>
            <div className="sidebar-footer-actions">
              <Button variant="danger" onClick={handleLogout} className="sidebar-logout-btn" title={t("logout")}>
                <span className="btn-label">{t("logout")}</span>
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </span>
              </Button>
              <button type="button" onClick={toggleSidebar} className="sidebar-toggle-btn" title={isSidebarCollapsed ? t("expand_menu") : t("collapse_menu")}>
                {isSidebarCollapsed ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                )}
              </button>
            </div>
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

