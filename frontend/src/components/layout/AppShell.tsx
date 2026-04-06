import { CSSProperties, PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/app/query-keys';
import { authApi } from '@/services/api/auth';
import { referenceDataApi } from '@/services/reference-data.api';
import { productsApi } from '@/features/products/api/products.api';
import { customersApi } from '@/features/customers/api/customers.api';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { dayRangeLast30 } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { navigationItems } from '@/app/router/registry';
import { canAccessNavigationItem } from '@/app/router/access';
import { PasswordRotationGate } from '@/components/system/PasswordRotationGate';
import { SystemStatusBanner } from '@/components/system/SystemStatusBanner';

function SideIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

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
  settings: { bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', border: '#cbd5e1', fg: '#475569', glow: 'rgba(71, 85, 105, 0.18)' },
};

const iconMap: Record<string, ReactNode> = {
  dashboard: <SideIcon><path d="M4.5 19.5h15" /><path d="M7.5 16.5v-4" /><path d="M12 16.5V8" /><path d="M16.5 16.5V5.5" /><path d="M4.5 9.5 9 6l3 2.5 4.5-4" /></SideIcon>,
  products: <SideIcon><path d="M12 2.8 4.2 6.7v10.6L12 21.2l7.8-3.9V6.7L12 2.8Z" /><path d="M4.2 6.7 12 11l7.8-4.3" /><path d="M12 11v10.2" /></SideIcon>,
  sales: <SideIcon><path d="M7.5 3.5h9l2 2.8v14.2h-13V6.3l2-2.8Z" /><path d="M9 8.5h6" /><path d="M9 12h6" /><path d="M9 15.5h4.5" /><path d="M15.8 3.5V7h3" /></SideIcon>,
  pos: <SideIcon><rect x="3.5" y="4.2" width="17" height="11.5" rx="2.5" /><path d="M8.5 19.8h7" /><path d="M12 15.7v4.1" /><path d="M7 8.4h10" /><path d="M7 11.5h4.5" /><path d="M15.3 11.5h1.7" /></SideIcon>,
  'cash-drawer': <SideIcon><path d="M4 10h16v8H4z" /><path d="M6 10V7.2h12V10" /><path d="M8.5 13.8h7" /><circle cx="12" cy="14" r="1.2" /></SideIcon>,
  purchases: <SideIcon><path d="M7.5 3.5h9l2 2.8v14.2h-13V6.3l2-2.8Z" /><path d="M12 8v8" /><path d="m8.8 12.3 3.2 3.2 3.2-3.2" /><path d="M15.8 3.5V7h3" /></SideIcon>,
  inventory: <SideIcon><path d="M3.5 7.2 12 3l8.5 4.2L12 11.4 3.5 7.2Z" /><path d="M3.5 12 12 16.2 20.5 12" /><path d="M3.5 16.8 12 21l8.5-4.2" /></SideIcon>,
  suppliers: <SideIcon><path d="M5 20V9.5l4-2.5 4 2.5V20" /><path d="M13 20V5.5L17 3l4 2.5V20" /><path d="M7.5 12.2h.01" /><path d="M10 12.2h.01" /><path d="M15.8 9h.01" /><path d="M18.2 9h.01" /></SideIcon>,
  customers: <SideIcon><circle cx="12" cy="8" r="3.7" /><path d="M5 20.5a7.8 7.8 0 0 1 14 0" /></SideIcon>,
  accounts: <SideIcon><rect x="3.8" y="5" width="16.4" height="13.5" rx="2.4" /><path d="M3.8 9.2h16.4" /><path d="M7.5 13.2h4" /><path d="M15.5 13.2h1.8" /><path d="M7.5 16h2.8" /></SideIcon>,
  returns: <SideIcon><path d="M8 7H4v4" /><path d="M4 11a8 8 0 1 0 2.6-5.9" /><path d="M16 17h4v-4" /></SideIcon>,
  reports: <SideIcon><path d="M5 19V10.2" /><path d="M10 19V5.5" /><path d="M15 19v-6.8" /><path d="M20 19v-4.6" /><path d="M3.8 19.5h16.4" /></SideIcon>,
  audit: <SideIcon><path d="M12 3 5.5 6v6c0 4.4 2.7 7 6.5 8.8 3.8-1.8 6.5-4.4 6.5-8.8V6L12 3Z" /><path d="m9.2 11.8 2 2 3.8-4" /></SideIcon>,
  treasury: <SideIcon><rect x="3.8" y="6" width="16.4" height="11.8" rx="2.3" /><circle cx="12" cy="11.9" r="2.3" /><path d="M7.5 10h.01" /><path d="M16.5 13.8h.01" /></SideIcon>,
  services: <SideIcon><path d="M14.5 6.5a3.4 3.4 0 1 0-4.8 4.8l-5.2 5.2 2.3 2.3 5.2-5.2a3.4 3.4 0 0 0 4.8-4.8Z" /><path d="m13 8 3 3" /></SideIcon>,
  settings: <SideIcon><circle cx="12" cy="12" r="3.2" /><path d="M19.2 14.4a1.7 1.7 0 0 0 .3 1.8l.05.06a2 2 0 1 1-2.82 2.82l-.06-.05a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-.98 1.55V20.4a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.98-1.56 1.7 1.7 0 0 0-1.8.31l-.06.05a2 2 0 1 1-2.82-2.82l.05-.06a1.7 1.7 0 0 0 .31-1.8 1.7 1.7 0 0 0-1.55-.98H3.6a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-.98 1.7 1.7 0 0 0-.31-1.8l-.05-.06a2 2 0 1 1 2.82-2.82l.06.05a1.7 1.7 0 0 0 1.8.31 1.7 1.7 0 0 0 .98-1.55V3.6a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .98 1.56 1.7 1.7 0 0 0 1.8-.31l.06-.05a2 2 0 1 1 2.82 2.82l-.05.06a1.7 1.7 0 0 0-.31 1.8 1.7 1.7 0 0 0 1.55.98h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56.98Z" /></SideIcon>,
};

const dashboardWarmRange = (() => {
  const reference = new Date();
  reference.setHours(23, 59, 59, 999);
  return dayRangeLast30(reference);
})();

const warmupQueries: Array<{ queryKey: readonly string[]; queryFn: () => Promise<unknown> }> = [
  { queryKey: queryKeys.dashboardOverview(dashboardWarmRange.from, dashboardWarmRange.to), queryFn: () => dashboardApi.overview(dashboardWarmRange.from, dashboardWarmRange.to) },
  { queryKey: queryKeys.settings, queryFn: referenceDataApi.settings },
  { queryKey: queryKeys.branches, queryFn: referenceDataApi.branches },
  { queryKey: queryKeys.locations, queryFn: referenceDataApi.locations },
  { queryKey: queryKeys.categories, queryFn: productsApi.categories },
  { queryKey: queryKeys.products, queryFn: productsApi.list },
  { queryKey: queryKeys.customers, queryFn: customersApi.list },
  { queryKey: queryKeys.suppliers, queryFn: suppliersApi.list },
];

function AppNavIcon({ itemKey }: { itemKey: string }) {
  return <>{iconMap[itemKey] || <SideIcon><circle cx="12" cy="12" r="8" /></SideIcon>}</>;
}

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const displayName = useMemo(() => user?.displayName || user?.username || 'مستخدم', [user]);
  const visibleNavigationItems = useMemo(() => {
    const hiddenKeys = new Set<string>([]);
    const preferredOrder = [
      'dashboard',
      'pos',
      'cash-drawer',
      'sales',
      'purchases',
      'returns',
      'accounts',
      'treasury',
      'services',
      'audit',
      'inventory',
      'products',
      'customers',
      'suppliers',
      'reports',
      'settings',
    ];
    const labelOverrides: Record<string, string> = {
      dashboard: 'الرئيسية',
      pos: 'الكاشير',
      sales: 'سجل الفواتير',
      'cash-drawer': 'وردية الكاشير',
      accounts: 'الحسابات',
      treasury: 'الخزينة',
      services: 'الخدمات',
      audit: 'سجل النشاط',
    };

    const items = navigationItems
      .filter((item) => canAccessNavigationItem(user, item))
      .filter((item) => !hiddenKeys.has(item.key));

    return items
      .map((item) => ({ ...item, label: labelOverrides[item.key] || item.label }))
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.key);
        const bIndex = preferredOrder.indexOf(b.key);
        const safeA = aIndex === -1 ? 999 : aIndex;
        const safeB = bIndex === -1 ? 999 : bIndex;
        return safeA - safeB;
      });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      warmupQueries.forEach((query) => {
        void queryClient.prefetchQuery({
          queryKey: query.queryKey,
          queryFn: query.queryFn,
          staleTime: 60_000,
        });
      });
    };

    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void; };
    const idleId = idleWindow.requestIdleCallback?.(warm, { timeout: 1200 });
    const timeoutId = window.setTimeout(warm, 450);

    return () => {
      cancelled = true;
      if (typeof idleId === 'number') {
        idleWindow.cancelIdleCallback?.(idleId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [queryClient]);

  useEffect(() => {
    const resetScroll = () => {
      const contentWrap = document.querySelector('.content-wrap') as HTMLElement | null;
      const pageStack = document.querySelector('.content-wrap .page-stack') as HTMLElement | null;

      if (contentWrap) {
        contentWrap.scrollTop = 0;
      }

      if (pageStack) {
        pageStack.scrollTop = 0;
      }

      window.scrollTo(0, 0);
    };

    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate('/login?reason=signed-out', { replace: true });
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar-fixed">
        <div className="brand">
          <div className="brand-logo"><span className="z-mark">Z</span><span className="systems-mark">Systems</span></div>
          <div>
            <div className="brand-title">Z Systems</div>
            <div className="brand-sub">نظام كاشير ومخزون لمتجر واحد</div>
            <div className="brand-sub muted">سريع وواضح للاستخدام اليومي</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleNavigationItems.map((item) => {
            const tone = iconToneMap[item.key] || iconToneMap.settings;
            const toneStyle = {
              '--icon-bg': tone.bg,
              '--icon-border': tone.border,
              '--icon-fg': tone.fg,
              '--icon-glow': tone.glow,
            } as CSSProperties;

            return (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                data-key={item.key}
                style={toneStyle}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`.trim()}
              >
                <span className="sidebar-icon"><AppNavIcon itemKey={item.key} /></span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="stack gap-8" style={{ marginBottom: 12 }}>
            <div className="muted small">مرحبًا {displayName}</div>
          </div>
          <Button variant="danger" onClick={handleLogout} className="full-width">تسجيل الخروج</Button>
        </div>
      </aside>
      <div className="content-wrap">
        <div className="stack gap-12" style={{ padding: '12px 16px 0' }}>
          <SystemStatusBanner />
        </div>
        <main className="page-stack">{children}</main>
      </div>
      <PasswordRotationGate />
    </div>
  );
}
