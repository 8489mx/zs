import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredDocs = [
  path.join(root, 'ARCHITECTURE.md'),
  path.join(root, 'CLIENT_UAT_CHECKLIST.md'),
  path.join(root, 'PHASE15_COMMERCIAL_POLISH.md'),
  path.join(root, 'UAT_SIGNOFF.md'),
];

const requiredFiles = [
  path.join(root, 'src', 'lib', 'http.ts'),
  path.join(root, 'src', 'shared', 'system', 'system-status-banner.tsx'),
  path.join(root, 'src', 'shared', 'layout', 'app-shell.tsx'),
  path.join(root, 'src', 'features', 'auth', 'pages', 'LoginPage.tsx'),
  path.join(root, 'src', 'app', 'providers.tsx'),
];

let failed = false;
for (const file of [...requiredDocs, ...requiredFiles]) {
  if (!fs.existsSync(file)) {
    console.error(`[release-audit] missing: ${path.relative(root, file)}`);
    failed = true;
  }
}

const frontendPackageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const scriptName of ['build', 'qa:critical', 'qa:guards', 'qa:release', 'qa:rc']) {
  if (!frontendPackageJson.scripts?.[scriptName]) {
    console.error(`[release-audit] missing frontend script: ${scriptName}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('[release-audit] ok');
