import assert from 'node:assert/strict';
import { assertStrongPassword, MIN_PASSWORD_LENGTH } from '../../src/core/auth/utils/password-policy';

assert.throws(() => assertStrongPassword('short'), /PASSWORD_TOO_WEAK/);
assert.doesNotThrow(() => assertStrongPassword('AdminStrong123!'));
assert.throws(
  () => assertStrongPassword('weak-pass', { minLength: 14, code: 'BOOTSTRAP_PASSWORD_TOO_WEAK' }),
  /BOOTSTRAP_PASSWORD_TOO_WEAK/,
);
assert.equal(MIN_PASSWORD_LENGTH, 12);

console.log('password-policy.spec.ts passed');
