import { strict as assert } from 'node:assert';
import { requiresPlatformMfaEnrolment } from '../../src/core/auth/services/session.service';

const policyOn = { MFA_REQUIRED_FOR_PLATFORM: 'true' } as NodeJS.ProcessEnv;
const policyOff = { MFA_REQUIRED_FOR_PLATFORM: 'false' } as NodeJS.ProcessEnv;
// Platform owner with unenrolled MFA can never get a password-only session after enabling the policy.
assert.equal(requiresPlatformMfaEnrolment('zs', 'super_admin', false, policyOn), true);
assert.equal(requiresPlatformMfaEnrolment('zs', 'admin', false, policyOn), true);
assert.equal(requiresPlatformMfaEnrolment('zs', 'admin', true, policyOn), false);
assert.equal(requiresPlatformMfaEnrolment('zs', 'admin', false, policyOff), false);
assert.equal(requiresPlatformMfaEnrolment('customer-tenant', 'admin', false, policyOn), false);
assert.equal(requiresPlatformMfaEnrolment('zs', 'cashier', false, policyOn), false);
console.log('Mandatory platform MFA enrolment guards passed');
