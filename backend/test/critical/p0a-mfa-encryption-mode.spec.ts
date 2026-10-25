import { strict as assert } from 'node:assert';
import { resolveMfaEncryptionKey } from '../../src/core/auth/utils/mfa-secret-cipher';

function run(): void {
  const missing = { SESSION_SECRET: '', MFA_ENCRYPTION_KEY: '', PORTABLE_MODE: 'true', IS_ELECTRON: 'true' } as any;
  assert.throws(() => resolveMfaEncryptionKey({ ...missing, APP_MODE: 'CLOUD_SAAS' }), /SESSION_SECRET \/ MFA_ENCRYPTION_KEY/);
  assert.throws(() => resolveMfaEncryptionKey({ ...missing, APP_MODE: undefined }), /SESSION_SECRET \/ MFA_ENCRYPTION_KEY/);
  assert.throws(() => resolveMfaEncryptionKey({ ...missing, APP_MODE: 'UNKNOWN' }), /SESSION_SECRET \/ MFA_ENCRYPTION_KEY/);
  assert.equal(resolveMfaEncryptionKey({ ...missing, APP_MODE: 'SELF_CONTAINED' }).length, 32);
  assert.equal(resolveMfaEncryptionKey({ ...missing, APP_MODE: 'LOCAL_PILOT' }).length, 32);
}
run();
