import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const setupFlowSource = readFileSync(path.join(root, 'src', 'features', 'settings', 'hooks', 'useFirstRunSetupFlow.ts'), 'utf8');
const passwordGateSource = readFileSync(path.join(root, 'src', 'shared', 'system', 'password-rotation-gate.tsx'), 'utf8');
const userMutationSource = readFileSync(path.join(root, 'src', 'features', 'settings', 'hooks', 'user-management', 'useUserManagementMutation.ts'), 'utf8');
const postLoginRouteSource = readFileSync(path.join(root, 'src', 'features', 'auth', 'lib', 'post-login-route.ts'), 'utf8');

if (!setupFlowSource.includes("key: 'secure-account'")) {
  throw new Error('Setup flow is missing the secure-account step');
}

if (!/usingDefaultAdminPassword\s*!==\s*true/.test(setupFlowSource) && !setupFlowSource.includes('hasSecureBootstrapAccount')) {
  throw new Error('Setup flow no longer verifies that the bootstrap account was secured');
}

if (!passwordGateSource.includes("user?.usingDefaultAdminPassword === true")) {
  throw new Error('Password rotation gate does not enforce rotation for the default bootstrap password flag');
}

if (!passwordGateSource.includes('MIN_PASSWORD_LENGTH')) {
  throw new Error('Password rotation gate no longer uses the shared password policy constant');
}

if (!userMutationSource.includes("setupStepKey === 'secure-account'")) {
  throw new Error('User-management setup flow no longer advances secure-account step updates');
}

if (!postLoginRouteSource.includes('shouldStartSetupFlow')) {
  throw new Error('Post-login setup routing guard is missing');
}

console.log('Setup/security guard check passed.');
