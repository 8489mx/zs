import { DEFAULT_STORE_NAME } from '@/config/app-defaults';
import { canAccessPath, isPlatformAdmin } from '@/app/router/access';
import type { AuthTenant, AuthUser } from '@/types/auth';

const SETUP_ENTRY_ROUTE = '/settings/core?setup=1';
const ONBOARDING_ROUTE = '/onboarding';

const ROUTE_PREFERENCES: Record<AuthUser['role'], string[]> = {
  cashier: ['/pos', '/cash-drawer', '/sales', '/customers', '/services', '/expenses', '/'],
  admin: ['/', '/pos', '/sales', '/inventory', '/accounts', '/treasury', '/purchases', '/reports/overview', '/customers', '/suppliers', '/products', '/returns', '/cash-drawer', '/services', '/settings'],
  super_admin: ['/', '/pos', '/settings', '/sales', '/inventory', '/reports/overview', '/accounts', '/treasury', '/purchases', '/products', '/returns', '/cash-drawer', '/customers', '/suppliers', '/services'],
};

function normalizeValue(value: unknown) {
  return String(value || '').trim();
}

function pickOperationalLandingRoute(user: AuthUser) {
  const preferredRoutes = ROUTE_PREFERENCES[user.role] || ROUTE_PREFERENCES.admin;
  return preferredRoutes.find((route) => canAccessPath(user, route)) || '/';
}

export interface PostLoginContext {
  tenant?: AuthTenant | null;
  deploymentMode?: 'desktop' | 'server' | string | null;
  onboardingCompleted?: boolean;
}

function isSaasOrTrialContext(context?: PostLoginContext) {
  const tenant = context?.tenant;
  return context?.deploymentMode === 'server' || tenant?.isTrial === true || tenant?.status === 'trial';
}

export function shouldStartSetupFlow(user: AuthUser | null | undefined, storeName: string | null | undefined, context?: PostLoginContext) {
  if (!user || user.role !== 'super_admin') return false;
  if (context?.onboardingCompleted === true) return false;
  if (isSaasOrTrialContext(context)) return false;
  if (user.usingDefaultAdminPassword === true) return true;
  return normalizeValue(storeName) === DEFAULT_STORE_NAME;
}

export function getPostLoginRoute(user: AuthUser | null | undefined, storeName: string | null | undefined, context?: PostLoginContext) {
  if (!user) return '/login';
  if (shouldStartSetupFlow(user, storeName, context)) return SETUP_ENTRY_ROUTE;
  if (!isPlatformAdmin(user) && (user.role === 'admin' || user.role === 'super_admin') && context?.onboardingCompleted === false) {
    return ONBOARDING_ROUTE;
  }
  return pickOperationalLandingRoute(user);
}
