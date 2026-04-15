import type { NavigationItemDefinition } from '@/app/router/types';
import type { AuthUser } from '@/types/auth';

export type RoutePermissionRequirement = string | string[] | null;

const routePermissionMap: Record<string, RoutePermissionRequirement> = {
  dashboard: 'dashboard',
  '/': 'dashboard',
  products: 'products',
  '/products': 'products',
  sales: 'sales',
  '/sales': 'sales',
  pos: 'sales',
  '/pos': 'sales',
  'cash-drawer': ['cashDrawer', 'treasury'],
  '/cash-drawer': ['cashDrawer', 'treasury'],
  purchases: 'purchases',
  '/purchases': 'purchases',
  inventory: 'inventory',
  '/inventory': 'inventory',
  suppliers: 'suppliers',
  '/suppliers': 'suppliers',
  customers: 'customers',
  '/customers': 'customers',
  accounts: 'accounts',
  '/accounts': 'accounts',
  returns: 'returns',
  '/returns': 'returns',
  reports: 'reports',
  '/reports': 'reports',
  audit: 'audit',
  '/audit': 'audit',
  treasury: 'treasury',
  '/treasury': 'treasury',
  services: 'services',
  '/services': 'services',
  'pricing-center': 'pricingCenterView',
  '/pricing-center': 'pricingCenterView',
  settings: ['settings', 'canManageSettings'],
  '/settings': ['settings', 'canManageSettings'],
};

function normalizeAccessKey(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '/';
  if (trimmed === '/') return '/';
  return trimmed.replace(/^\//, '').replace(/\/$/, '') || '/';
}

function normalizePermissionList(input: RoutePermissionRequirement): string[] {
  if (!input) return [];
  return Array.isArray(input) ? input.map((entry) => String(entry || '').trim()).filter(Boolean) : [String(input).trim()].filter(Boolean);
}

export function hasAnyPermission(user: AuthUser | null | undefined, required: RoutePermissionRequirement) {
  if (!required) return true;
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const needed = normalizePermissionList(required);
  if (!needed.length) return true;
  const userPermissions = new Set((user.permissions || []).map((permission) => String(permission || '').trim()).filter(Boolean));
  return needed.some((permission) => userPermissions.has(permission));
}

export function getRoutePermissionRequirement(target: string) {
  const normalized = normalizeAccessKey(target);
  const directMatch = routePermissionMap[normalized] ?? routePermissionMap[`/${normalized}`];
  if (directMatch) return directMatch;
  const [rootSegment] = normalized.split('/').filter(Boolean);
  if (!rootSegment) return routePermissionMap['/'] ?? null;
  return routePermissionMap[rootSegment] ?? routePermissionMap[`/${rootSegment}`] ?? null;
}

export function canAccessPath(user: AuthUser | null | undefined, target: string) {
  return hasAnyPermission(user, getRoutePermissionRequirement(target));
}

export function canAccessNavigationItem(user: AuthUser | null | undefined, item: NavigationItemDefinition) {
  return hasAnyPermission(user, getRoutePermissionRequirement(item.key || item.to));
}

export function findFirstAccessibleRoute(user: AuthUser | null | undefined, navigationItems: NavigationItemDefinition[]) {
  return navigationItems.find((item) => canAccessNavigationItem(user, item))?.to ?? null;
}

export function getFirstAccessibleRoute(user: AuthUser | null | undefined, navigationItems: NavigationItemDefinition[]) {
  return findFirstAccessibleRoute(user, navigationItems) || '/';
}
