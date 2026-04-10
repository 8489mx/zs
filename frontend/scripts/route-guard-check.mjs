import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  const full = path.resolve(root, relativePath);
  return fs.readFileSync(full, 'utf8');
}

const checks = [
  {
    label: 'Accounts route composition',
    file: 'src/features/accounts/pages/AccountsPage.tsx',
    mustInclude: ['AccountsWorkspace'],
  },
  {
    label: 'Settings route composition',
    file: 'src/features/settings/pages/SettingsPage.tsx',
    mustInclude: ['SettingsPageShell', 'useSettingsPageController'],
    linkedChecks: [
      {
        file: 'src/features/settings/pages/useSettingsPageController.ts',
        mustInclude: ['useSettingsAdminWorkspace'],
      },
      {
        file: 'src/features/settings/components/SettingsPageShell.tsx',
        mustInclude: ['QueryCard'],
      },
    ],
  },
  {
    label: 'POS route composition',
    file: 'src/features/pos/pages/PosPage.tsx',
    mustInclude: ['PosWorkspace'],
  },
];

let failures = 0;

for (const check of checks) {
  const source = read(check.file);
  for (const token of check.mustInclude) {
    if (!source.includes(token)) {
      console.error(`${path.basename(check.file)} is missing required token: ${token}`);
      failures += 1;
    }
  }

  for (const linked of check.linkedChecks || []) {
    const linkedSource = read(linked.file);
    for (const token of linked.mustInclude) {
      if (!linkedSource.includes(token)) {
        console.error(`${path.basename(linked.file)} is missing required token: ${token}`);
        failures += 1;
      }
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log('Route guard check passed.');
