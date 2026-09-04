import { strict as assert } from 'node:assert';
import { AuthCacheService } from '../../src/core/auth/services/auth-cache.service';
import { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';

const cache = new AuthCacheService();

const mockAuth: AuthContext = {
  userId: 10,
  sessionId: 'test-session-123',
  username: 'admin',
  role: 'admin',
  permissions: ['dashboard', 'pos', 'sales'],
  tenantId: 'tenant-abc',
  accountId: 'account-abc',
  planId: 'plan_pro',
  extraFeatures: ['custom_reports'],
};

// 1. Test Session Caching
(() => {
  assert.equal(cache.getSession('test-session-123'), null);
  cache.setSession('test-session-123', mockAuth, 60);

  const cached = cache.getSession('test-session-123');
  assert.ok(cached);
  assert.equal(cached?.userId, 10);
  assert.equal(cached?.tenantId, 'tenant-abc');
  assert.equal(cached?.planId, 'plan_pro');

  cache.invalidateSession('test-session-123');
  assert.equal(cache.getSession('test-session-123'), null);
})();

// 2. Test Tenant Status Caching
(() => {
  assert.equal(cache.isTenantAllowed('tenant-abc'), null);
  cache.setTenantAllowed('tenant-abc', true, 60);
  assert.equal(cache.isTenantAllowed('tenant-abc'), true);

  cache.setTenantAllowed('tenant-suspended', false, 60);
  assert.equal(cache.isTenantAllowed('tenant-suspended'), false);
})();

// 3. Test Invalidate Tenant and Tenant Sessions
(() => {
  cache.setSession('session-1', { ...mockAuth, sessionId: 'session-1', tenantId: 'tenant-x' });
  cache.setSession('session-2', { ...mockAuth, sessionId: 'session-2', tenantId: 'tenant-y' });
  cache.setTenantAllowed('tenant-x', true);

  assert.ok(cache.getSession('session-1'));
  assert.ok(cache.getSession('session-2'));
  assert.equal(cache.isTenantAllowed('tenant-x'), true);

  // Invalidate tenant-x
  cache.invalidateTenant('tenant-x');

  assert.equal(cache.getSession('session-1'), null); // Evicted!
  assert.ok(cache.getSession('session-2')); // Still present
  assert.equal(cache.isTenantAllowed('tenant-x'), null); // Evicted!
})();

// 4. Test Invalidate User Sessions
(() => {
  cache.setSession('session-u1', { ...mockAuth, sessionId: 'session-u1', userId: 99 });
  cache.setSession('session-u2', { ...mockAuth, sessionId: 'session-u2', userId: 100 });

  assert.ok(cache.getSession('session-u1'));
  assert.ok(cache.getSession('session-u2'));

  cache.invalidateUserSessions(99);
  assert.equal(cache.getSession('session-u1'), null);
  assert.ok(cache.getSession('session-u2'));
})();

cache.onModuleDestroy();
console.log('All AuthCacheService unit tests passed successfully!');
