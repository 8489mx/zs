import { describe, expect, it } from 'vitest';
import { getPostLoginRoute, shouldStartSetupFlow } from '@/features/auth/lib/post-login-route';
import type { AuthUser } from '@/types/auth';

const superAdminUser: AuthUser = {
  id: 'u-root',
  username: 'root',
  role: 'super_admin',
  permissions: [],
  displayName: 'Root',
  branchIds: ['b-1'],
  defaultBranchId: 'b-1',
  usingDefaultAdminPassword: false,
};

const adminUser: AuthUser = {
  ...superAdminUser,
  id: 'u-admin',
  username: 'manager',
  role: 'admin',
};

describe('post-login routing', () => {
  it('starts the setup flow for the bootstrap super admin when the default store name is still active', () => {
    expect(shouldStartSetupFlow(superAdminUser, 'Z Systems')).toBe(true);
    expect(getPostLoginRoute(superAdminUser, 'Z Systems')).toBe('/settings/core?setup=1');
  });

  it('starts the setup flow when the bootstrap password has not been rotated yet', () => {
    expect(getPostLoginRoute({ ...superAdminUser, usingDefaultAdminPassword: true }, 'My Store')).toBe('/settings/core?setup=1');
  });

  it('keeps operational admins on the application home route', () => {
    expect(shouldStartSetupFlow(adminUser, 'My Store')).toBe(false);
    expect(getPostLoginRoute(adminUser, 'My Store')).toBe('/');
  });
});
