import { strict as assert } from 'node:assert';
import { ForbiddenException } from '@nestjs/common';
import { SuperAdminRoleGuard } from '../../src/core/auth/guards/super-admin-role.guard';

function createMockContext(authContext: Record<string, unknown> | null) {
  const request = {
    authContext,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

function expectThrows(fn: () => unknown, expectedMessageSubstring: string): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ForbiddenException, `Expected ForbiddenException, got: ${thrown}`);
  assert.ok(
    String((thrown as Error).message).includes(expectedMessageSubstring),
    `Expected message to include "${expectedMessageSubstring}", got: ${(thrown as Error).message}`,
  );
}

function run(): void {
  const guard = new SuperAdminRoleGuard();

  // Test 1: Throws if no authContext
  expectThrows(() => {
    guard.canActivate(createMockContext(null));
  }, 'Authentication required');

  // Test 2: Throws if role is admin even on platform tenant
  expectThrows(() => {
    guard.canActivate(createMockContext({
      userId: 1,
      role: 'admin',
      tenantId: 'default',
    }));
  }, 'Only SaaS Platform Super Admin');

  // Test 3: Throws if role is cashier
  expectThrows(() => {
    guard.canActivate(createMockContext({
      userId: 2,
      role: 'cashier',
      tenantId: 'default',
    }));
  }, 'Only SaaS Platform Super Admin');

  // Test 4: CRITICAL - Throws if role is super_admin but tenant is NOT platform tenant!
  expectThrows(() => {
    guard.canActivate(createMockContext({
      userId: 3,
      role: 'super_admin',
      tenantId: 'tenant-customer-store',
    }));
  }, 'Only SaaS Platform Super Admin');

  // Test 5: CRITICAL - Throws if role is super_admin on any random tenant ID
  expectThrows(() => {
    guard.canActivate(createMockContext({
      userId: 4,
      role: 'super_admin',
      tenantId: 'random-tenant-1234',
    }));
  }, 'Only SaaS Platform Super Admin');

  // Test 6: Allows super_admin on 'default' platform tenant
  const allowedDefault = guard.canActivate(createMockContext({
    userId: 5,
    role: 'super_admin',
    tenantId: 'default',
  }));
  assert.equal(allowedDefault, true, 'Should allow super_admin on default tenant');

  // Test 7: Allows super_admin on 'dev-tenant'
  const allowedDev = guard.canActivate(createMockContext({
    userId: 6,
    role: 'super_admin',
    tenantId: 'dev-tenant',
  }));
  assert.equal(allowedDev, true, 'Should allow super_admin on dev-tenant');

  console.log('SuperAdminRoleGuard isolation tests passed: 7/7');
}

run();
