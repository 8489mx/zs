import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function assertContains(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const appShellSpec = read('src/shared/layout/app-shell.spec.tsx');
const loginPageSpec = read('src/features/auth/pages/LoginPage.spec.tsx');
const userManagementHelperSpec = read('src/features/settings/hooks/useUserManagement.helpers.spec.ts');
const systemBannerSpec = read('src/shared/system/system-status-banner.spec.tsx');
const passwordGateSpec = read('src/shared/system/password-rotation-gate.spec.tsx');

if (!appShellSpec.includes('clears the session and cached data on logout') && !appShellSpec.includes('clears the query cache and redirects to login after logout')) {
  throw new Error('AppShell integration spec must cover logout cache cleanup.');
}
assertContains(appShellSpec, 'حساب التثبيت', 'AppShell integration spec must cover the bootstrap-admin banner.');
assertContains(loginPageSpec, '/settings/core?setup=1', 'LoginPage integration spec must verify setup-flow redirect.');
assertContains(loginPageSpec, 'بيانات الدخول غير صحيحة', 'LoginPage integration spec must verify backend error rendering.');
assertContains(userManagementHelperSpec, '12 حرفًا', 'User management helper spec must guard the 12-character password policy.');
if (!systemBannerSpec.includes('queryClient.getQueryCache().findAll()') && !systemBannerSpec.includes("queryClient.getQueryData(['private', 'summary'])")) {
  throw new Error('SystemStatusBanner spec must verify query-cache cleanup on unauthorized.');
}
assertContains(passwordGateSpec, '12 حرفًا', 'PasswordRotationGate spec must guard the client-side password minimum length.');

console.log('Frontend auth UI test coverage check passed.');
