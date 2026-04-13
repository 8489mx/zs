import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createLazyRoute } from '@/app/router/lazy-route';
import { AppShell } from '@/shared/layout/app-shell';
import { AppErrorBoundary } from '@/shared/system/app-error-boundary';
import { Button } from '@/shared/ui/button';
import { useBootstrapAuth } from '@/features/auth/useBootstrapAuth';
import { useAuthStore } from '@/stores/auth-store';
import { appRoutes, navigationItems } from '@/app/router/registry';
import { canAccessPath, findFirstAccessibleRoute } from '@/app/router/access';
import { getPostLoginRoute } from '@/features/auth/lib/post-login-route';
import { ActivationPage } from '@/features/activation/pages/ActivationPage';
import { FirstRunSetupPage } from '@/features/activation/pages/FirstRunSetupPage';

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
  useBootstrapAuth();

  if (!initialized || appGate === 'loading') {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (appGate === expected) {
    return <>{children}</>;
  }

  if (appGate === 'activation') return <Navigate to="/activate" replace />;
  if (appGate === 'setup') return <Navigate to="/setup" replace />;
  if (user) return <Navigate to={getPostLoginRoute(user, useAuthStore.getState().storeName)} replace />;
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

  if (location.pathname === '/') {
    const postLoginRoute = getPostLoginRoute(user, useAuthStore.getState().storeName);
    if (postLoginRoute !== '/') return <Navigate to={postLoginRoute} replace />;
  }

  return <AppShell><Outlet /></AppShell>;
}

function LoginRoute() {
  const { initialized, user, appGate } = useAuthStore();

  if (!initialized || appGate === 'loading') {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (appGate === 'activation') return <Navigate to="/activate" replace />;
  if (appGate === 'setup') return <Navigate to="/setup" replace />;
  if (user) return <Navigate to={getPostLoginRoute(user, useAuthStore.getState().storeName)} replace />;

  return createLazyRoute(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
}

const router = createBrowserRouter([
  { path: '/activate', element: <AppGateGuard expected="activation"><ActivationPage /></AppGateGuard> },
  { path: '/setup', element: <AppGateGuard expected="setup"><FirstRunSetupPage /></AppGateGuard> },
  { path: '/login', element: <AppGateGuard expected="login"><LoginRoute /></AppGateGuard> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      ...appRoutes.map((route) => ({ index: route.index, path: route.path, element: route.element })),
      {
        path: '*',
        element: createLazyRoute(() => import('@/features/not-found/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
      }
    ]
  }
]);

export function AppRouter() {
  return <AppErrorBoundary><RouterProvider router={router} /></AppErrorBoundary>;
}
