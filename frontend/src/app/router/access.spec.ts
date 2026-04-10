import { describe, expect, it } from 'vitest';
import type { NavigationItemDefinition } from '@/app/router/types';
import { canAccessNavigationItem, canAccessPath, findFirstAccessibleRoute, getFirstAccessibleRoute, getRoutePermissionRequirement, hasAnyPermission } from '@/app/router/access';
import type { AuthUser } from '@/types/auth';

const adminUser: AuthUser = {
  id: 'u-admin',
  username: 'admin',
  role: 'admin',
  permissions: ['dashboard', 'inventory', 'reports', 'treasury'],
  displayName: 'Admin',
  branchIds: ['b-1'],
  defaultBranchId: 'b-1',
};

const superAdminUser: AuthUser = {
  ...adminUser,
  id: 'u-root',
  username: 'root',
  role: 'super_admin',
  permissions: [],
};

const navigationItems: NavigationItemDefinition[] = [
  { key: 'dashboard', label: 'الرئيسية', to: '/' },
  { key: 'inventory', label: 'المخزون', to: '/inventory' },
  { key: 'reports', label: 'التقارير', to: '/reports' },
];

describe('router access guards', () => {
  it('maps nested routes to their top-level permission requirement', () => {
    expect(getRoutePermissionRequirement('/inventory/transfers')).toBe('inventory');
    expect(getRoutePermissionRequirement('/settings/security')).toEqual(['settings', 'canManageSettings']);
  });

  it('allows treasury users to access the cash drawer workspace', () => {
    expect(canAccessPath(adminUser, '/cash-drawer')).toBe(true);
  });

  it('filters navigation items using explicit permissions', () => {
    expect(canAccessNavigationItem(adminUser, { key: 'reports', label: 'التقارير', to: '/reports' })).toBe(true);
    expect(canAccessNavigationItem(adminUser, { key: 'settings', label: 'الإعدادات', to: '/settings' })).toBe(false);
  });

  it('returns the first accessible route in navigation order', () => {
    expect(findFirstAccessibleRoute(adminUser, navigationItems)).toBe('/');
    expect(getFirstAccessibleRoute(adminUser, navigationItems)).toBe('/');
    expect(findFirstAccessibleRoute({ ...adminUser, permissions: ['reports'] }, navigationItems)).toBe('/reports');
  });

  it('returns null when the user has no accessible navigation items', () => {
    expect(findFirstAccessibleRoute({ ...adminUser, permissions: [] }, navigationItems)).toBeNull();
    expect(getFirstAccessibleRoute({ ...adminUser, permissions: [] }, navigationItems)).toBe('/');
  });

  it('grants all permissions to super admins', () => {
    expect(hasAnyPermission(superAdminUser, ['settings', 'canManageSettings'])).toBe(true);
    expect(canAccessPath(superAdminUser, '/settings')).toBe(true);
  });
});
