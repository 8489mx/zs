import type { NavigationItemDefinition } from '@/app/router/types';
import type { AuthUser } from '@/types/auth';

import { useAuthStore } from '@/stores/auth-store';

type RoutePermissionRequirement = string | string[] | null;

export const routePermissionMap: Record<string, RoutePermissionRequirement> = {
  dashboard: 'dashboard',
  '/': 'dashboard',
  products: 'products',
  '/products': 'products',
  'product-modifiers': 'products',
  '/products/modifiers': 'products',
  sales: 'sales',
  '/sales': 'sales',
  'sales-orders': 'sales',
  '/sales/orders': 'sales',
  crm: 'sales',
  '/crm': 'sales',
  'online-orders': 'sales',
  '/online-orders': 'sales',
  installments: 'sales',
  '/installments': 'sales',
  'vat-declaration': 'sales',
  '/vat-declaration': 'sales',
  displays: 'sales',
  '/displays': 'sales',
  pos: 'sales',
  '/pos': 'sales',
  'cash-drawer': ['cashDrawer', 'treasury'],
  '/cash-drawer': ['cashDrawer', 'treasury'],
  purchases: 'purchases',
  '/purchases': 'purchases',
  'purchases-orders': 'purchases',
  '/purchases/orders': 'purchases',
  'purchases-rfqs': 'purchases',
  '/purchases/rfqs': 'purchases',
  inventory: 'inventory',
  '/inventory': 'inventory',
  'inventory-bins': 'inventory',
  '/inventory/bins': 'inventory',
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
  'accounting-payment-allocation': 'accounting',
  'accounting/payment-allocation': 'accounting',
  '/accounting/payment-allocation': 'accounting',
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
  'accounting/fixed-assets': 'accounting',
  '/accounting/fixed-assets': 'accounting',
  'accounting/cost-centers': 'accounting',
  '/accounting/cost-centers': 'accounting',
  'accounting/balance-sheet': 'accounting',
  '/accounting/balance-sheet': 'accounting',
  'accounting/cash-flow': 'accounting',
  '/accounting/cash-flow': 'accounting',
  'accounting/aged-debts': 'accounting',
  '/accounting/aged-debts': 'accounting',
  'accounting/cheques': 'accounting',
  '/accounting/cheques': 'accounting',
  'accounting/withholding-tax': 'accounting',
  '/accounting/withholding-tax': 'accounting',
  'accounting-accounts': 'accounting',
  'accounting-cost-centers': 'accounting',
  'accounting-journal-entries': 'accounting',
  'accounting-cheques': 'accounting',
  'accounting-withholding-tax': 'accounting',
  'accounting-balance-sheet': 'accounting',
  'accounting-cash-flow': 'accounting',
  'accounting-aged-debts': 'accounting',
  'accounting-fixed-assets': 'accounting',
  'accounting-settings': 'accounting',
  'accounting-financial-summary': 'accounting',
  'accounting-receivables-payables': 'accounting',
  'accounting-cash-movement': 'accounting',
  'accounting-inventory-value': 'accounting',
  returns: 'returns',
  '/returns': 'returns',
  reports: 'reports',
  '/reports': 'reports',
  'reports-overview': 'reports',
  'reports-sales': 'reports',
  'reports-treasury': 'reports',
  'reports-inventory': 'reports',
  'reports-purchases': 'reports',
  'reports-balances': 'reports',
  'reports-employees': 'reports',
  'reports/overview': 'reports',
  '/reports/overview': 'reports',
  'reports/sales': 'reports',
  '/reports/sales': 'reports',
  'reports/treasury': 'reports',
  '/reports/treasury': 'reports',
  'reports/inventory': 'reports',
  '/reports/inventory': 'reports',
  'reports/purchases': 'reports',
  '/reports/purchases': 'reports',
  'reports/balances': 'reports',
  '/reports/balances': 'reports',
  'reports/employees': 'reports',
  '/reports/employees': 'reports',
  audit: 'audit',
  '/audit': 'audit',
  treasury: 'treasury',
  '/treasury': 'treasury',
  expenses: 'treasury',
  '/expenses': 'treasury',
  services: 'services',
  '/services': 'services',
  maintenance: 'sales',
  '/maintenance': 'sales',
  'trade-in': 'purchases',
  '/trade-in': 'purchases',
  'imei-history': 'products',
  '/products/imei-history': 'products',
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
  'hr/attendance': 'hrAttendance',
  '/hr/attendance': 'hrAttendance',
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
  'hr-settlements': 'hr',
  'hr/settlements': 'hr',
  '/hr/settlements': 'hr',
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
  'purchase-returns': 'returns',
  '/purchase-returns': 'returns',
  'purchases-new': 'purchases',
  'inventory-issue-order-new': 'inventory',
  'inventory-issue-orders': 'inventory',
  'inventory-warehouses': 'inventory',
  'product-categories': 'products',
  qz: null,
  '/qz': null,
};

export const routeFeatureMap: Record<string, string | null> = {
  dashboard: 'reports',
  '/': 'reports',
  'owner-companion': 'reports',
  '/owner-companion': 'reports',
  'owner-mobile': 'reports',
  '/owner-mobile': 'reports',
  'mobile/owner': 'reports',
  '/mobile/owner': 'reports',
  catalog: 'catalog',
  products: 'catalog',
  'product-categories': 'catalog',
  services: 'catalog',
  'sales-orders': 'sales',
  '/sales-orders': 'sales',
  '/sales/orders': 'sales',
  'price-lists': 'catalog',
  '/price-lists': 'catalog',
  '/sales/price-lists': 'catalog',
  crm: 'sales',
  '/crm': 'sales',
  quotations: 'sales',
  '/quotations': 'sales',
  installments: 'installments',
  '/installments': 'installments',
  'vat-declaration': 'vat_declaration',
  '/vat-declaration': 'vat_declaration',
  displays: 'restaurant',
  '/displays': 'restaurant',
  kds: 'restaurant',
  '/kds': 'restaurant',
  signage: 'restaurant',
  '/signage': 'restaurant',
  '/pos/customer-display': 'restaurant',
  pos: 'sales',
  '/pos': 'sales',
  returns: 'sales',
  '/returns': 'sales',
  customers: 'sales',
  '/customers': 'sales',
  'pricing-center': 'catalog',
  '/pricing-center': 'catalog',
  'cash-drawer': 'cashDrawer',
  '/cash-drawer': 'cashDrawer',
  treasury: 'cashDrawer',
  '/treasury': 'cashDrawer',
  expenses: 'cashDrawer',
  '/expenses': 'cashDrawer',

  // Purchases
  purchases: 'purchases',
  '/purchases': 'purchases',
  'purchases-orders': 'purchases',
  '/purchases/orders': 'purchases',
  'purchases-rfqs': 'purchases',
  '/purchases/rfqs': 'purchases',
  'purchases-new': 'purchases',
  '/purchases/new': 'purchases',
  'purchases-reorder': 'purchases',
  '/purchases/reorder': 'purchases',
  'purchase-returns': 'purchases',
  '/purchase-returns': 'purchases',
  suppliers: 'purchases',
  '/suppliers': 'purchases',

  // Inventory
  inventory: 'inventory',
  '/inventory': 'inventory',
  'inventory-batches': 'inventory',
  '/inventory/batches': 'inventory',
  'inventory-bins': 'inventory',
  '/inventory/bins': 'inventory',
  'inventory-issue-orders': 'inventory',
  '/inventory/transfers': 'inventory',
  'inventory-warehouses': 'inventory',
  '/inventory/warehouses': 'inventory',
  'inventory-tree': 'inventory',
  '/inventory-tree': 'inventory',
  '/inventory/tree': 'inventory',
  'inventory-issue-order-new': 'inventory',
  '/inventory/issue-order/new': 'inventory',

  // Reports
  reports: 'reports',
  '/reports': 'reports',
  'reports-overview': 'reports',
  '/reports/overview': 'reports',
  'reports-sales': 'reports',
  '/reports/sales': 'reports',
  'reports-treasury': 'reports',
  '/reports/treasury': 'reports',
  'reports-inventory': 'reports',
  '/reports/inventory': 'reports',
  'reports-purchases': 'reports',
  '/reports/purchases': 'reports',
  'reports-balances': 'accounting',
  '/reports/balances': 'accounting',
  'reports-employees': 'hr',
  '/reports/employees': 'hr',
  audit: 'reports',
  '/audit': 'reports',

  // HR
  hr: 'hr',
  '/hr': 'hr',
  'hr-settlements': 'hr',
  '/hr/settlements': 'hr',

  // Manufacturing
  manufacturing: 'manufacturing',
  '/manufacturing': 'manufacturing',
  'manufacturing-components': 'manufacturing',
  '/manufacturing/components': 'manufacturing',
  'manufacturing-boms': 'manufacturing',
  '/manufacturing/boms': 'manufacturing',
  'manufacturing-work-orders': 'manufacturing',
  '/manufacturing/work-orders': 'manufacturing',
  'manufacturing-work-centers': 'manufacturing',
  '/manufacturing/work-centers': 'manufacturing',
  'manufacturing-settings': 'manufacturing',
  '/manufacturing/settings': 'manufacturing',

  // Accounting
  accounting: 'accounting',
  '/accounting': 'accounting',
  accounts: 'accounting',
  '/accounts': 'accounting',
  'accounting-accounts': 'accounting',
  '/accounting/accounts': 'accounting',
  'accounting-cost-centers': 'accounting',
  '/accounting/cost-centers': 'accounting',
  'accounting-journal-entries': 'accounting',
  '/accounting/journal-entries': 'accounting',
  'accounting-payment-allocation': 'accounting',
  '/accounting/payment-allocation': 'accounting',
  'accounting-bank-reconciliation': 'accounting',
  '/accounting/bank-reconciliation': 'accounting',
  'accounting-cheques': 'accounting',
  '/accounting/cheques': 'accounting',
  'accounting-withholding-tax': 'accounting',
  '/accounting/withholding-tax': 'accounting',
  'accounting-balance-sheet': 'accounting',
  '/accounting/balance-sheet': 'accounting',
  'accounting-cash-flow': 'accounting',
  '/accounting/cash-flow': 'accounting',
  'accounting-aged-debts': 'accounting',
  '/accounting/aged-debts': 'accounting',
  'accounting-fixed-assets': 'fixed_assets',
  '/accounting-fixed-assets': 'fixed_assets',
  '/accounting/fixed-assets': 'fixed_assets',
  'accounting-settings': 'accounting',
  '/accounting/settings': 'accounting',
  'accounting-financial-summary': 'accounting',
  '/accounting/financial-summary': 'accounting',
  'accounting-receivables-payables': 'accounting',
  '/accounting/receivables-payables': 'accounting',
  'accounting-cash-movement': 'accounting',
  '/accounting/cash-movement': 'accounting',
  'accounting-inventory-value': 'accounting',
  '/accounting/inventory-value': 'accounting',

  // Delivery & Van Sales
  'delivery-reps': 'deliveryReps',
  '/delivery-reps': 'deliveryReps',
  'driver-mobile': 'deliveryReps',
  '/driver-mobile': 'deliveryReps',
  'van-sales-admin': 'deliveryReps',
  '/van-sales/admin': 'deliveryReps',
  '/inventory/van-sales': 'deliveryReps',

  // Tax & Reference
  'tax-dispatcher': 'taxIntegration',
  '/tax-dispatcher': 'taxIntegration',
  'settings/reference': null,
  'settings/tax-integration': 'taxIntegration',

  // Online Storefront
  'online-orders': 'storefront',
  '/online-orders': 'storefront',
  storefront: 'storefront',
  '/storefront': 'storefront',

  // Mobile / Maintenance
  maintenance: 'maintenance',
  '/maintenance': 'maintenance',
  'trade-in': 'maintenance',
  '/trade-in': 'maintenance',
  'imei-history': 'maintenance',
  '/imei-history': 'maintenance',
  '/products/imei-history': 'maintenance',

  // Pharmacy
  pharmacy: 'pharmacy',
  '/pharmacy': 'pharmacy',
  'pharmacy-dashboard': 'pharmacy',
  '/pharmacy/dashboard': 'pharmacy',
  'pharmacy-drugs': 'pharmacy',
  '/pharmacy/drugs': 'pharmacy',
  'pharmacy-prescriptions': 'pharmacy',
  '/pharmacy/prescriptions': 'pharmacy',
  'pharmacy-shortages': 'pharmacy',
  '/pharmacy/shortages': 'pharmacy',
  'pharmacy-batches': 'pharmacy',
  '/pharmacy/batches': 'pharmacy',
  'pharmacy-clinical': 'pharmacy',
  '/pharmacy/clinical': 'pharmacy',

  // Import
  import: 'import',
  '/import': 'import',
  'import-shipments': 'import',
  '/import/shipments': 'import',
  'import-supplier-credit': 'import',
  '/import/supplier-credit': 'import',
  'import-profit-pool': 'import',
  '/import/profit-pool': 'import',

  // Other modules
  restaurant: 'restaurant',
  '/restaurant': 'restaurant',
  'product-modifiers': 'restaurant',
  '/products/modifiers': 'restaurant',
  clothing: 'clothing',
  '/clothing': 'clothing',
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

export function isDesktopOfflineApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).electronRuntime ||
    (window as any).electronAPI ||
    (window as any).process?.versions?.electron ||
    (window.navigator?.userAgent && window.navigator.userAgent.toLowerCase().includes('electron')) ||
    import.meta.env.MODE === 'electron' ||
    import.meta.env.MODE === 'portable'
  );
}

export function isPlatformAdmin(user: AuthUser | null | undefined) {
  if (isDesktopOfflineApp()) return false;
  if (!user) return false;
  if (user.role !== 'super_admin') return false;

  const configuredPlatformTenantId = String(import.meta.env?.VITE_PLATFORM_TENANT_ID || 'zs').trim();
  const tenantId = String(user?.tenantId || '').trim();
  const accountId = String(user?.accountId || '').trim();
  const hasExplicitTenant = tenantId.length > 0;

  const isPlatformTenant = tenantId === configuredPlatformTenantId || tenantId === 'zs' || tenantId === 'default' || tenantId === 'dev-tenant';
  const canUseAccountFallback = !hasExplicitTenant && (accountId === 'zs' || accountId === 'default' || accountId === configuredPlatformTenantId);

  return Boolean(isPlatformTenant || canUseAccountFallback);
}

export function getRoutePermissionRequirement(target: string) {
  const normalized = normalizeAccessKey(target);
  const directMatch = routePermissionMap[normalized] ?? routePermissionMap[`/${normalized}`];
  if (directMatch) return directMatch;
  if (normalized.startsWith('hr/')) {
    if (normalized.startsWith('hr/employees')) return routePermissionMap['hr/employees'] ?? 'hrEmployees';
    if (normalized.startsWith('hr/attendance')) return routePermissionMap['hr/attendance'] ?? 'hrAttendance';
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

export function getRouteFeatureRequirement(target: string) {
  const normalized = normalizeAccessKey(target);
  const directMatch = routeFeatureMap[normalized] ?? routeFeatureMap[`/${normalized}`];
  if (directMatch !== undefined) return directMatch;
  const [rootSegment] = normalized.split('/').filter(Boolean);
  if (!rootSegment) return null;
  const rootMatch = routeFeatureMap[rootSegment] ?? routeFeatureMap[`/${rootSegment}`];
  if (rootMatch !== undefined) return rootMatch;

  // Prefix fallbacks to prevent any unmapped nested route or hyphenated subroute from leaking
  if (rootSegment.startsWith('purchases')) return 'purchases';
  if (rootSegment.startsWith('inventory')) return 'inventory';
  if (rootSegment.startsWith('reports')) return 'reports';
  if (rootSegment.startsWith('accounting')) return 'accounting';
  if (rootSegment.startsWith('hr')) return 'hr';
  if (rootSegment.startsWith('manufacturing')) return 'manufacturing';
  if (rootSegment.startsWith('pharmacy')) return 'pharmacy';
  if (rootSegment.startsWith('import')) return 'import';
  if (rootSegment.startsWith('van-sales') || rootSegment.startsWith('driver-mobile')) return 'deliveryReps';
  return null;
}

export function hasRequiredFeature(target: string, user?: AuthUser | null): boolean {
  if (isPlatformAdmin(user)) return true;

  const requiredFeature = getRouteFeatureRequirement(target);
  if (!requiredFeature) return true;
  
  const tenant = useAuthStore.getState().tenant;
  if (!tenant) return true;
  if (!tenant.features || !Array.isArray(tenant.features)) return false;
  
  return tenant.features.includes(requiredFeature);
}

export function canAccessPath(user: AuthUser | null | undefined, target: string) {
  const normalized = normalizeAccessKey(target);
  if (normalized === 'saas-admin' || normalized === 'saas-admin/tenants' || normalized.startsWith('saas-admin/')) {
    if (isDesktopOfflineApp()) return false;
    return isPlatformAdmin(user);
  }
  if (isPlatformAdmin(user)) return true;
  if (!hasRequiredFeature(target, user)) return false;
  return hasAnyPermission(user, getRoutePermissionRequirement(target));
}

export function canAccessNavigationItem(user: AuthUser | null | undefined, item: NavigationItemDefinition) {
  if (item.platformOnly) return isPlatformAdmin(user);
  if (isPlatformAdmin(user)) return true;
  if (!hasRequiredFeature(item.to, user) || (item.key && !hasRequiredFeature(item.key, user))) return false;
  return hasAnyPermission(user, getRoutePermissionRequirement(item.key || item.to));
}

export function findFirstAccessibleRoute(user: AuthUser | null | undefined, navigationItems: NavigationItemDefinition[]) {
  return navigationItems.find((item) => canAccessNavigationItem(user, item))?.to ?? null;
}

export function getFirstAccessibleRoute(user: AuthUser | null | undefined, navigationItems: NavigationItemDefinition[]) {
  return findFirstAccessibleRoute(user, navigationItems) || '/';
}
