import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import { AppShell } from '@/shared/layout/app-shell';
import { AppErrorBoundary } from '@/shared/system/app-error-boundary';
import { useBootstrapAuth } from '@/features/auth/useBootstrapAuth';
import { useAuthStore } from '@/stores/auth-store';
import { appRoutes, navigationItems } from '@/app/router/registry';
import { canAccessPath, getFirstAccessibleRoute } from '@/app/router/access';
import { getPostLoginRoute } from '@/features/auth/lib/post-login-route';

function ProtectedLayout() {
  const { initialized, user } = useAuthStore();
  const location = useLocation();
  useBootstrapAuth();

  if (!initialized) {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to={getFirstAccessibleRoute(user, navigationItems)} replace />;
  }

  if (location.pathname === '/') {
    const postLoginRoute = getPostLoginRoute(user, useAuthStore.getState().storeName);
    if (postLoginRoute !== '/') {
      return <Navigate to={postLoginRoute} replace />;
    }
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LoginRoute() {
  const { initialized, user } = useAuthStore();
  useBootstrapAuth();

  if (!initialized) {
    return <div className="screen-center"><div className="loading-card">جاري تجهيز النظام...</div></div>;
  }

  if (user) {
    return <Navigate to={getPostLoginRoute(user, useAuthStore.getState().storeName)} replace />;
  }

  return createLazyRoute(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute /> },
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
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
