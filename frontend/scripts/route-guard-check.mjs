import fs from 'node:fs';
import path from 'node:path';

const checks = [
  {
    file: path.resolve(process.cwd(), 'src/features/accounts/pages/AccountsPage.tsx'),
    mustInclude: ['AccountsWorkspace']
  },
  {
    file: path.resolve(process.cwd(), 'src/features/settings/pages/SettingsPage.tsx'),
    mustInclude: ['QueryCard', 'useSettingsAdminWorkspace']
  },
  {
    file: path.resolve(process.cwd(), 'src/features/pos/pages/PosPage.tsx'),
    mustInclude: ['PosWorkspace']
  }
];

let failures = 0;
for (const check of checks) {
  const source = fs.readFileSync(check.file, 'utf8');
  for (const token of check.mustInclude) {
    if (!source.includes(token)) {
      console.error(`${path.basename(check.file)} is missing required token: ${token}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log('Route guard check passed.');
