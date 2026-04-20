import { strict as assert } from 'node:assert';
import { AppError } from '../../src/common/errors/app-error';
import { requireTenantScope } from '../../src/core/auth/utils/tenant-boundary';

function run(): void {
  assert.deepEqual(
    requireTenantScope({ tenantId: ' tenant-a ', accountId: ' account-a ' } as any),
    { tenantId: 'tenant-a', accountId: 'account-a' },
  );

  assert.throws(
    () => requireTenantScope({ tenantId: '', accountId: 'account-a' } as any),
    (error: unknown) => error instanceof AppError && error.code === 'TENANT_SCOPE_REQUIRED',
  );

  assert.throws(
    () => requireTenantScope({ tenantId: 'tenant-a', accountId: '' } as any),
    (error: unknown) => error instanceof AppError && error.code === 'TENANT_SCOPE_REQUIRED',
  );

  console.log('tenant-boundary.spec: ok');
}

run();
