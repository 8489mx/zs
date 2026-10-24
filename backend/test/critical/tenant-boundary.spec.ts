import { strict as assert } from 'node:assert';
import { AppError } from '../../src/common/errors/app-error';
import { getPlatformTenantIds, requireTenantScope } from '../../src/core/auth/utils/tenant-boundary';
import { isDesktopRuntimeMode } from '../../src/config/app-mode';
import { validateEnv } from '../../src/config/env.schema';
import { DeveloperController } from '../../src/modules/saas-admin/developer.controller';
import { ForbiddenException } from '@nestjs/common';

function run(): void {
  assert.deepEqual(getPlatformTenantIds('CLOUD_SAAS', 'zsystems-main'), ['zsystems-main', 'zs']);
  assert.deepEqual(getPlatformTenantIds('SELF_CONTAINED', 'zs'), ['zs', 'default', 'dev-tenant']);
  assert.equal(isDesktopRuntimeMode('online'), false);
  assert.equal(isDesktopRuntimeMode(undefined), false);
  assert.equal(isDesktopRuntimeMode('unknown'), false);
  assert.equal(isDesktopRuntimeMode('offline'), true);
  assert.equal(isDesktopRuntimeMode('SELF_CONTAINED'), true);

  const cloudEnv = {
    NODE_ENV: 'production', APP_MODE: 'CLOUD_SAAS',
    DATABASE_HOST: '127.0.0.1', DATABASE_PORT: '5432', DATABASE_NAME: 'app',
    DATABASE_USER: 'user', DATABASE_PASSWORD: 'password',
    SESSION_CSRF_SECRET: 'explicit-test-secret-for-csrf',
    TENANT_ID: 'zs', ACCOUNT_ID: 'zs', CORS_ORIGINS: 'https://app.example.com',
    SMTP_HOST: 'smtp.example.com', MAIL_FROM_EMAIL: 'no-reply@example.com',
  };
  assert.doesNotThrow(() => validateEnv(cloudEnv));
  for (const key of ['PORTABLE_MODE', 'IS_ELECTRON']) {
    assert.throws(() => validateEnv({ ...cloudEnv, [key]: 'true' }), /CLOUD_SAAS cannot enable/);
  }
  assert.throws(() => validateEnv({ ...cloudEnv, APP_MODE: 'online', IS_ELECTRON: 'true' }), /CLOUD_SAAS cannot enable/);
  assert.doesNotThrow(() => validateEnv({ ...cloudEnv, APP_MODE: 'SELF_CONTAINED', IS_ELECTRON: 'true', ALLOW_SESSION_ID_HEADER: 'true' }));

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

}

async function runDeveloperBoundary(): Promise<void> {
  const originalPortable = process.env.PORTABLE_MODE;
  const originalElectron = process.env.IS_ELECTRON;
  try {
    process.env.PORTABLE_MODE = 'true';
    process.env.IS_ELECTRON = 'true';
    let writes = 0;
    const service = { developerUpdateTenantPlan: async () => { writes++; return { ok: true }; } };
    const cloud = new DeveloperController(service as any, {
      get: (key: string) => key === 'APP_MODE' ? 'CLOUD_SAAS' : 'configured-test-secret',
    } as any);
    await assert.rejects(() => cloud.updatePlan({ masterPassword: 'infoadmin' }), ForbiddenException);
    assert.equal(writes, 0, 'Cloud must reject the developer write before reaching the service');

    const desktop = new DeveloperController(service as any, {
      get: (key: string) => key === 'APP_MODE' ? 'SELF_CONTAINED' : 'configured-test-secret',
    } as any);
    await desktop.updatePlan({ masterPassword: 'infoadmin' });
    assert.equal(writes, 1, 'the explicitly retained desktop password must keep working');
  } finally {
    if (originalPortable === undefined) delete process.env.PORTABLE_MODE;
    else process.env.PORTABLE_MODE = originalPortable;
    if (originalElectron === undefined) delete process.env.IS_ELECTRON;
    else process.env.IS_ELECTRON = originalElectron;
  }
}

run();
void runDeveloperBoundary().then(() => {
  console.log('tenant-boundary.spec: ok');
}).catch((error) => { console.error(error); process.exitCode = 1; });
