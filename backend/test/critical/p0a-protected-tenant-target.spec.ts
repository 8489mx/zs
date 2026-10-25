import { strict as assert } from 'node:assert';
import { isProtectedTenantDataTarget } from '../../src/core/tenant-transfer/protected-tenant-target';

assert.equal(isProtectedTenantDataTarget('zs', 'SELF_CONTAINED', 'zs'), true);
assert.equal(isProtectedTenantDataTarget('default', 'SELF_CONTAINED', 'zs'), false);
assert.equal(isProtectedTenantDataTarget('dev-tenant', 'LOCAL_PILOT', 'zs'), false);
assert.equal(isProtectedTenantDataTarget('merchant-a', 'CLOUD_SAAS', 'zs'), false);
assert.equal(isProtectedTenantDataTarget('zs', 'CLOUD_SAAS', 'zs'), true);
assert.equal(isProtectedTenantDataTarget('default', 'CLOUD_SAAS', 'default'), true);
assert.equal(isProtectedTenantDataTarget('platform-custom', 'CLOUD_SAAS', 'platform-custom'), true);
assert.equal(isProtectedTenantDataTarget('platform-custom', 'SELF_CONTAINED', 'platform-custom'), false);
assert.equal(isProtectedTenantDataTarget('', 'CLOUD_SAAS', 'zs'), true);
