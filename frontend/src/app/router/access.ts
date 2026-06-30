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
  accounting: 'accounting',
  '/accounting': 'accounting',
  'accounting/accounts': 'accounting',
  '/accounting/accounts': 'accounting',
  'accounting/journal-entries': 'accounting',
  '/accounting/journal-entries': 'accounting',
  'accounting/settings': 'accounting',
  '/accounting/settings': 'accounting',
  'accounting/financial-summary': 'accounting',
  '/accounting/financial-summary': 'accounting',
  'accounting/receivables-payables': 'accounting',
  '/accounting/receivables-payables': 'accounting',
  'accounting/cash-movement': 'accounting',
  '/accounting/cash-movement': 'accounting',
  'accounting/inventory-value': 'accounting',
  '/accounting/inventory-value': 'accounting',
  'accounting-accounts': 'accounting',
  'accounting-journal-entries': 'accounting',
  'accounting-settings': 'accounting',
  'accounting-financial-summary': 'accounting',
  'accounting-receivables-payables': 'accounting',
  'accounting-cash-movement': 'accounting',
  'accounting-inventory-value': 'accounting',
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
  hr: 'hr',
  '/hr': 'hr',
  'hr/employees': 'hrEmployees',
  '/hr/employees': 'hrEmployees',
  'hr/employees/new': 'hrEmployees',
  '/hr/employees/new': 'hrEmployees',
  'hr/employees/:id': 'hrEmployees',
  '/hr/employees/:id': 'hrEmployees',
  'hr/employees/:id/edit': 'hrEmployees',
  '/hr/employees/:id/edit': 'hrEmployees',
  'hr/attendance': 'hrEmployees',
  '/hr/attendance': 'hrEmployees',
  'hr/leaves': 'hrEmployees',
  '/hr/leaves': 'hrEmployees',
  'hr/assets': 'hrEmployees',
  '/hr/assets': 'hrEmployees',
  'hr/documents': 'hrEmployees',
  '/hr/documents': 'hrEmployees',
  'hr/loans': 'hrLoans',
  '/hr/loans': 'hrLoans',
  'hr/payroll': 'hrPayrollView',
  '/hr/payroll': 'hrPayrollView',
  'hr/reports': 'hr',
  '/hr/reports': 'hr',
  'hr/settings': 'hr',
  '/hr/settings': 'hr',
  'pricing-center': 'pricingCenterView',
  '/pricing-center': 'pricingCenterView',
  'saas-admin/tenants': null,
  '/saas-admin/tenants': null,
  settings: ['settings', 'canManageSettings'],
  '/settings': ['settings', 'canManageSettings'],
  'manufacturing-components': 'manufacturing',
  'manufacturing-boms': 'manufacturing',
  'manufacturing-work-orders': 'manufacturing',
  'manufacturing-settings': 'manufacturing',
  'manufacturing/boms': 'manufacturing',
  '/manufacturing/boms': 'manufacturing',
  'manufacturing/boms/new': 'manufacturing',
  '/manufacturing/boms/new': 'manufacturing',
  'manufacturing/work-orders': 'manufacturing',
  '/manufacturing/work-orders': 'manufacturing',
  'manufacturing/work-orders/new': 'manufacturing',
  '/manufacturing/work-orders/new': 'manufacturing',
  'manufacturing/settings': 'manufacturing',
  '/manufacturing/settings': 'manufacturing',
  'manufacturing/components': 'manufacturing',
  '/manufacturing/components': 'manufacturing',
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

export function isPlatformAdmin(user: AuthUser | null | undefined) {
  const configuredPlatformTenantId = String(import.meta.env?.VITE_PLATFORM_TENANT_ID || '').trim();
  
  if (!configuredPlatformTenantId) {
    return false;
  }

  const tenantId = String(user?.tenantId || '').trim();
  const accountId = String(user?.accountId || '').trim();
  const hasExplicitTenant = tenantId.length > 0;
  const isPlatformTenant = tenantId === 'default' || tenantId === configuredPlatformTenantId;
  const canUseAccountFallback = !hasExplicitTenant && accountId === 'default';

  return Boolean(
    user?.role === 'super_admin'
    && (isPlatformTenant || canUseAccountFallback)
  );
}

export function getRoutePermissionRequirement(target: string) {
  const normalized = normalizeAccessKey(target);
  const directMatch = routePermissionMap[normalized] ?? routePermissionMap[`/${normalized}`];
  if (directMatch) return directMatch;
  if (normalized.startsWith('hr/')) {
    if (normalized.startsWith('hr/employees')) return routePermissionMap['hr/employees'] ?? 'hrEmployees';
    if (normalized.startsWith('hr/attendance')) return routePermissionMap['hr/attendance'] ?? 'hrEmployees';
    if (normalized.startsWith('hr/leaves')) return routePermissionMap['hr/leaves'] ?? 'hrEmployees';
    if (normalized.startsWith('hr/assets')) return routePermissionMap['hr/assets'] ?? 'hrEmployees';
    if (normalized.startsWith('hr/documents')) return routePermissionMap['hr/documents'] ?? 'hrEmployees';
    if (normalized.startsWith('hr/loans')) return routePermissionMap['hr/loans'] ?? 'hrLoans';
    if (normalized.startsWith('hr/payroll')) return routePermissionMap['hr/payroll'] ?? 'hrPayrollView';
    if (normalized.startsWith('hr/reports')) return routePermissionMap['hr/reports'] ?? 'hr';
    if (normalized.startsWith('hr/settings')) return routePermissionMap['hr/settings'] ?? 'hr';
    return routePermissionMap.hr ?? 'hr';
  }
  const [rootSegment] = normalized.split('/').filter(Boolean);
  if (!rootSegment) return routePermissionMap['/'] ?? null;
  return routePermissionMap[rootSegment] ?? routePermissionMap[`/${rootSegment}`] ?? null;
}

export function canAccessPath(user: AuthUser | null | undefined, target: string) {
  const normalized = normalizeAccessKey(target);
  if (normalized === 'saas-admin' || normalized === 'saas-admin/tenants' || normalized.startsWith('saas-admin/')) {
    return isPlatformAdmin(user);
  }
  return hasAnyPermission(user, getRoutePermissionRequirement(target));
}

export function canAccessNavigationItem(user: AuthUser | null | undefined, item: NavigationItemDefinition) {
  if (item.platformOnly) return isPlatformAdmin(user);
  return hasAnyPermission(user, getRoutePermissionRequirement(item.key || item.to));
}

export function findFirstAccessibleRoute(user: AuthUser | null | undefined, navigationItems: NavigationItemDefinition[]) {
  return navigationItems.find((item) => canAccessNavigationItem(user, item))?.to ?? null;
}

export function getFirstAccessibleRoute(user: AuthUser | null | undefined, navigationItems: NavigationItemDefinition[]) {
  return findFirstAccessibleRoute(user, navigationItems) || '/';
}
