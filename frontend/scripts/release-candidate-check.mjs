import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checks = [
  ['src/lib/http.ts', ['APP_UNAUTHORIZED_EVENT', 'APP_NETWORK_STATE_EVENT', 'REQUEST_TIMEOUT_MS']],
  ['src/components/system/SystemStatusBanner.tsx', ['APP_UNAUTHORIZED_EVENT', 'APP_NETWORK_STATE_EVENT', 'useNavigate']],
  ['src/components/layout/AppShell.tsx', ['SystemStatusBanner', 'BackendHealthBadge', 'React فقط']],
  ['src/features/auth/pages/LoginPage.tsx', ['SystemStatusBanner']],
  ['src/app/providers.tsx', ['mutations', 'retry: false']]
];

for (const [file, markers] of checks) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    throw new Error(`Missing required file: ${file}`);
  }
  const content = readFileSync(full, 'utf8');
  for (const marker of markers) {
    if (!content.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

console.log('release_candidate_check_passed');
