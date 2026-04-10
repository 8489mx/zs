import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..', '..');
const frontendSecurityPath = path.join(root, 'frontend', 'src', 'config', 'security.ts');
const backendPolicyPath = path.join(root, 'backend', 'src', 'core', 'auth', 'utils', 'password-policy.ts');
const frontendHelperPath = path.join(root, 'frontend', 'src', 'features', 'settings', 'hooks', 'useUserManagement.helpers.ts');

function readMinLength(source, label) {
  const match = source.match(/MIN_PASSWORD_LENGTH\s*=\s*(\d+)/);
  if (!match) {
    throw new Error(`تعذر استخراج MIN_PASSWORD_LENGTH من ${label}`);
  }
  return Number(match[1]);
}

const frontendPolicy = readFileSync(frontendSecurityPath, 'utf8');
const backendPolicy = readFileSync(backendPolicyPath, 'utf8');
const frontendHelper = readFileSync(frontendHelperPath, 'utf8');

const frontendMin = readMinLength(frontendPolicy, 'frontend/src/config/security.ts');
const backendMin = readMinLength(backendPolicy, 'backend/src/core/auth/utils/password-policy.ts');

if (frontendMin !== backendMin) {
  throw new Error(`Password policy mismatch: frontend=${frontendMin}, backend=${backendMin}`);
}

if (/8\s*أحرف/.test(frontendHelper) || /<\s*8/.test(frontendHelper)) {
  throw new Error('Frontend user-management helper still references an outdated 8-character password policy');
}

console.log(`Password policy sync check passed (${frontendMin} chars).`);
