import { strict as assert } from 'node:assert';
import { resolveTenantContext } from '../../src/core/auth/utils/tenant-context';

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

function runDefaultFallback(): void {
  const config = new FakeConfigService({});
  const context = resolveTenantContext(config as any);
  assert.equal(context.tenantId, 'default');
  assert.equal(context.accountId, 'default');
}

function runConfigOverrides(): void {
  const config = new FakeConfigService({ TENANT_ID: 'tenant-a', ACCOUNT_ID: 'acct-a' });
  const context = resolveTenantContext(config as any);
  assert.equal(context.tenantId, 'tenant-a');
  assert.equal(context.accountId, 'acct-a');
}

function runAuthOverrides(): void {
  const config = new FakeConfigService({ TENANT_ID: 'tenant-a', ACCOUNT_ID: 'acct-a' });
  const context = resolveTenantContext(config as any, { tenantId: 'tenant-b', accountId: 'acct-b' });
  assert.equal(context.tenantId, 'tenant-b');
  assert.equal(context.accountId, 'acct-b');
}

function main(): void {
  runDefaultFallback();
  runConfigOverrides();
  runAuthOverrides();
  console.log('tenant-context.spec: ok');
}

main();
