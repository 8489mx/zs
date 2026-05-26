import assert from 'node:assert/strict';
import { assertStrongPassword, MIN_PASSWORD_LENGTH } from '../../src/core/auth/utils/password-policy';

assert.throws(() => assertStrongPassword(''), /PASSWORD_REQUIRED/);
assert.throws(() => assertStrongPassword('   '), /PASSWORD_REQUIRED/);
assert.doesNotThrow(() => assertStrongPassword('1'));
assert.doesNotThrow(() => assertStrongPassword('a'));
assert.equal(MIN_PASSWORD_LENGTH, 1);

console.log('password-policy.spec.ts passed');
