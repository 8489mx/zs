import { strict as assert } from 'node:assert';

import { isPlatformTenantId } from '../../src/core/auth/utils/tenant-boundary';

const previousMode = process.env.APP_MODE;
const previousPlatform = process.env.PLATFORM_TENANT_ID;

try {
  process.env.APP_MODE = 'CLOUD_SAAS';
  process.env.PLATFORM_TENANT_ID = 'zs';
  assert.equal(isPlatformTenantId('zs'), true);
  assert.equal(isPlatformTenantId('default'), false);
  assert.equal(isPlatformTenantId('dev-tenant'), false);

  process.env.APP_MODE = 'SELF_CONTAINED';
  assert.equal(isPlatformTenantId('default'), true);
  assert.equal(isPlatformTenantId('dev-tenant'), true);
  assert.equal(isPlatformTenantId('merchant-a'), false);

  console.log('platform-tenant-identity.spec: cloud aliases are isolated and local aliases remain supported');
} finally {
  if (previousMode === undefined) delete process.env.APP_MODE;
  else process.env.APP_MODE = previousMode;
  if (previousPlatform === undefined) delete process.env.PLATFORM_TENANT_ID;
  else process.env.PLATFORM_TENANT_ID = previousPlatform;
}
