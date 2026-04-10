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

const setupFlow = read('src/features/settings/hooks/useFirstRunSetupFlow.ts');
const appShell = read('src/shared/layout/app-shell.tsx');
const dashboardPage = read('src/features/dashboard/pages/DashboardPage.tsx');
const userManagementMutation = read('src/features/settings/hooks/user-management/useUserManagementMutation.ts');
const loginForm = read('src/features/auth/hooks/useLoginForm.ts');

assertContains(setupFlow, "'secure-account'", 'useFirstRunSetupFlow must define the secure-account step.');
assertContains(setupFlow, "nextLabel: 'الانتقال إلى تأمين حساب التثبيت'", 'The admin-user step must hand off to secure-account explicitly.');
assertContains(appShell, 'BootstrapAdminBanner', 'AppShell must render BootstrapAdminBanner globally.');
if (dashboardPage.includes('BootstrapAdminBanner')) {
  throw new Error('DashboardPage should not render BootstrapAdminBanner directly once AppShell owns the global warning.');
}
assertContains(userManagementMutation, 'updateSessionUser', 'User management mutation must synchronize the active auth session after self updates.');
assertContains(loginForm, 'clearQueryClientData(queryClient)', 'Login flow must clear stale query cache when a new session starts.');

console.log('Frontend auth/setup hardening check passed.');
