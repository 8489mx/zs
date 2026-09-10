import { createBrowserRouter, createHashRouter, Navigate, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { createLazyRoute } from '@/app/router/lazy-route';
import { AppShell } from '@/shared/layout/app-shell';
import { AppErrorBoundary } from '@/shared/system/app-error-boundary';
import { Button } from '@/shared/ui/button';
import { useBootstrapAuth } from '@/features/auth/useBootstrapAuth';
import { useAuthStore } from '@/stores/auth-store';
import { appRoutes, navigationItems } from '@/app/router/registry';
import { canAccessPath, findFirstAccessibleRoute } from '@/app/router/access';
import { getPostLoginRoute } from '@/features/auth/lib/post-login-route';
import { AppCloseGuard } from '@/shared/layout/AppCloseGuard';

const ActivationPage = lazy(() => import('@/features/activation/pages/ActivationPage').then(m => ({ default: m.ActivationPage })));
const FirstRunSetupPage = lazy(() => import('@/features/activation/pages/FirstRunSetupPage').then(m => ({ default: m.FirstRunSetupPage })));
const SaaSOnboardingPage = lazy(() => import('@/features/activation/pages/SaaSOnboardingPage').then(m => ({ default: m.SaaSOnboardingPage })));
const SupplierQuickPaymentDialog = lazy(() => import('@/features/accounts/components/SupplierQuickPaymentDialog').then(m => ({ default: m.SupplierQuickPaymentDialog })));
const QuickCashAdvanceModal = lazy(() => import('@/features/hr/components/QuickCashAdvanceModal').then(m => ({ default: m.QuickCashAdvanceModal })));
const QuickOffersModal = lazy(() => import('@/features/products/components/QuickOffersModal').then(m => ({ default: m.QuickOffersModal })));

const isElectron = typeof window !== 'undefined' && (
  Boolean((window as any).electronAPI) ||
  Boolean((window as any).process?.versions?.electron) ||
  window.navigator.userAgent.toLowerCase().includes('electron') ||
  import.meta.env.MODE === 'electron' ||
  import.meta.env.MODE === 'portable'
);

const createRouter = isElectron ? createHashRouter : createBrowserRouter;

function NoWorkspaceAccess() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  function handleExit() {
    clearSession();
    navigate('/login?reason=signed-out', { replace: true });
  }

  return (
    <div className="screen-center">
      <div className="loading-card stack gap-12" style={{ maxWidth: 420, textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>لا توجد صلاحيات مفعّلة لهذا الحساب</h2>
        <p className="muted" style={{ margin: 0 }}>
          لا يمكن فتح أي مساحة عمل حاليًا. راجع مسؤول النظام لتفعيل صلاحيات مناسبة لهذا المستخدم.
        </p>
        <Button type="button" variant="secondary" onClick={handleExit}>تسجيل الخروج</Button>
      </div>
    </div>
  );
}

function AppGateGuard({ expected, children }: { expected: 'activation' | 'setup' | 'login'; children: ReactNode }) {
  const { initialized, appGate, user } = useAuthStore();
  const location = useLocation();
  useBootstrapAuth();

  const isPreview = new URLSearchParams(location.search).get('preview') === '1';
  if (isPreview) {
    return <>{children}</>;
  }

  if (!initialized || appGate === 'loading') {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (appGate === expected) {
    return <>{children}</>;
  }

  if (appGate === 'activation') return <Navigate to="/activate" replace />;
  if (appGate === 'setup') return <Navigate to="/setup" replace />;
  if (user) {
    const state = useAuthStore.getState();
    return <Navigate to={getPostLoginRoute(user, state.storeName, { tenant: state.tenant, deploymentMode: state.activationStatus?.deploymentMode })} replace />;
  }
  return <Navigate to="/login" replace />;
}

function ProtectedLayout() {
  const { initialized, user, appGate } = useAuthStore();
  const location = useLocation();
  useBootstrapAuth();

  if (!initialized || appGate === 'loading') {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (appGate === 'activation') return <Navigate to="/activate" replace />;
  if (appGate === 'setup') return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;

  const firstAccessibleRoute = findFirstAccessibleRoute(user, navigationItems);

  if (!canAccessPath(user, location.pathname)) {
    if (!firstAccessibleRoute) return <NoWorkspaceAccess />;
    return <Navigate to={firstAccessibleRoute} replace />;
  }

  return (
    <AppShell>
      <Outlet />
      <Suspense fallback={null}>
        <SupplierQuickPaymentDialog />
        <QuickCashAdvanceModal />
        <QuickOffersModal />
      </Suspense>
    </AppShell>
  );
}

function LoginRoute() {
  const { initialized, user, appGate } = useAuthStore();

  if (!initialized || appGate === 'loading') {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (appGate === 'activation') return <Navigate to="/activate" replace />;
  if (appGate === 'setup') return <Navigate to="/setup" replace />;
  if (user) {
    const state = useAuthStore.getState();
    return <Navigate to={getPostLoginRoute(user, state.storeName, { tenant: state.tenant, deploymentMode: state.activationStatus?.deploymentMode })} replace />;
  }

  return createLazyRoute(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
}

const router = createRouter([
  { path: '/activate', element: <AppGateGuard expected="activation"><Suspense fallback={<div className="screen-center"><div className="loading-card">جاري التجهيز...</div></div>}><ActivationPage /></Suspense></AppGateGuard> },
  { path: '/setup', element: <AppGateGuard expected="setup"><Suspense fallback={<div className="screen-center"><div className="loading-card">جاري التجهيز...</div></div>}><FirstRunSetupPage /></Suspense></AppGateGuard> },
  { path: '/onboarding', element: <Suspense fallback={<div className="screen-center"><div className="loading-card">جاري التجهيز...</div></div>}><SaaSOnboardingPage /></Suspense> },
  {
    path: '/trial',
    element: createLazyRoute(() => import('@/features/public-trial/pages/TrialSignupPage').then((module) => ({ default: module.TrialSignupPage }))),
  },
  {
    path: '/st/:slug',
    element: createLazyRoute(() => import('@/features/storefront/pages/PublicStorefrontPage').then((module) => ({ default: module.PublicStorefrontPage }))),
  },
  {
    path: '/st/:slug/table/:tableNo',
    element: createLazyRoute(() => import('@/features/storefront/pages/PublicStorefrontPage').then((module) => ({ default: module.PublicStorefrontPage }))),
  },
  {
    path: '/store/:slug',
    element: createLazyRoute(() => import('@/features/storefront/pages/PublicStorefrontPage').then((module) => ({ default: module.PublicStorefrontPage }))),
  },
  {
    path: '/store/:slug/table/:tableNo',
    element: createLazyRoute(() => import('@/features/storefront/pages/PublicStorefrontPage').then((module) => ({ default: module.PublicStorefrontPage }))),
  },
  {
    path: '/shop/:slug',
    element: createLazyRoute(() => import('@/features/storefront/pages/PublicStorefrontPage').then((module) => ({ default: module.PublicStorefrontPage }))),
  },
  {
    path: '/table/:tableNo',
    element: createLazyRoute(() => import('@/features/storefront/pages/PublicStorefrontPage').then((module) => ({ default: module.PublicStorefrontPage }))),
  },
  {
    path: '/driver',
    element: createLazyRoute(() => import('@/features/delivery-reps/pages/DriverPortalPage').then((module) => ({ default: module.DriverPortalPage }))),
  },
  {
    path: '/driver-portal',
    element: <Navigate to="/driver" replace />,
  },
  {
    path: '/van-sales',
    element: createLazyRoute(() => import('@/features/delivery-reps/pages/VanSalesMobilePage')),
  },
  {
    path: '/van',
    element: <Navigate to="/van-sales" replace />,
  },
  {
    path: '/pos/customer-display',
    element: createLazyRoute(() => import('@/features/pos/pages/CustomerFacingDisplayPage').then((module) => ({ default: module.CustomerFacingDisplayPage }))),
  },
  {
    path: '/customer-display',
    element: <Navigate to="/pos/customer-display" replace />,
  },
  {
    path: '/kds',
    element: createLazyRoute(() => import('@/features/pos/pages/KitchenDisplayPage').then((module) => ({ default: module.KitchenDisplayPage }))),
  },
  {
    path: '/kitchen',
    element: <Navigate to="/kds" replace />,
  },
  {
    path: '/signage',
    element: createLazyRoute(() => import('@/features/pos/pages/DigitalSignagePage').then((module) => ({ default: module.DigitalSignagePage }))),
  },
  {
    path: '/promo-board',
    element: <Navigate to="/signage" replace />,
  },
  {
    path: '/punch',
    element: createLazyRoute(() => import('@/features/hr/pages/MobilePunchPage')),
  },
  {
    path: '/attendance/punch',
    element: <Navigate to="/punch" replace />,
  },
  {
    path: '/portal',
    element: createLazyRoute(() => import('@/features/hr/pages/EmployeePortalPage')),
  },
  {
    path: '/employee-portal',
    element: <Navigate to="/portal" replace />,
  },
  {
    path: '/ess',
    element: <Navigate to="/portal" replace />,
  },
  {
    path: '/hub',
    element: createLazyRoute(() => import('@/features/portals-hub/pages/PortalsHubPage')),
  },
  {
    path: '/portals',
    element: <Navigate to="/hub" replace />,
  },
  {
    path: '/apps',
    element: <Navigate to="/hub" replace />,
  },
  {
    path: '/launchpad',
    element: <Navigate to="/hub" replace />,
  },
  {
    path: '/owner',
    element: <Navigate to="/owner-companion" replace />,
  },
  { path: '/login', element: <AppGateGuard expected="login"><LoginRoute /></AppGateGuard> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      ...appRoutes.map((route) => ({ index: route.index, path: route.path, element: route.element })),
      {
        path: 'profile',
        element: createLazyRoute(() => import('@/features/auth/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
      },
      {
        path: '*',
        element: createLazyRoute(() => import('@/features/not-found/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
      }
    ]
  }
]);

export function AppRouter() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
      <AppCloseGuard />
    </AppErrorBoundary>
  );
}
