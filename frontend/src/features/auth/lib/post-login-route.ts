import { DEFAULT_STORE_NAME } from '@/config/app-defaults';
import { canAccessPath } from '@/app/router/access';
import type { AuthUser } from '@/types/auth';

const SETUP_ENTRY_ROUTE = '/settings/core?setup=1';

const ROUTE_PREFERENCES: Record<AuthUser['role'], string[]> = {
  cashier: ['/pos', '/cash-drawer', '/sales', '/customers', '/'],
  admin: ['/', '/sales', '/inventory', '/accounts', '/treasury', '/purchases', '/reports/overview', '/customers', '/suppliers', '/products', '/returns', '/cash-drawer', '/services', '/settings'],
  super_admin: ['/', '/settings', '/sales', '/inventory', '/reports/overview', '/accounts', '/treasury', '/purchases', '/products', '/returns', '/cash-drawer', '/customers', '/suppliers', '/services'],
};

function normalizeValue(value: unknown) {
  return String(value || '').trim();
}

function pickOperationalLandingRoute(user: AuthUser) {
  const preferredRoutes = ROUTE_PREFERENCES[user.role] || ROUTE_PREFERENCES.admin;
  return preferredRoutes.find((route) => canAccessPath(user, route)) || '/';
}

export function shouldStartSetupFlow(user: AuthUser | null | undefined, storeName: string | null | undefined) {
  if (!user || user.role !== 'super_admin') return false;
  if (user.usingDefaultAdminPassword === true) return true;
  return normalizeValue(storeName) === DEFAULT_STORE_NAME;
}

export function getPostLoginRoute(user: AuthUser | null | undefined, storeName: string | null | undefined) {
  if (!user) return '/login';
  if (shouldStartSetupFlow(user, storeName)) return SETUP_ENTRY_ROUTE;
  return pickOperationalLandingRoute(user);
}
