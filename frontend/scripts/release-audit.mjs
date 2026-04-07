import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd(), '..');
const requiredDocs = [
  path.join(projectRoot, 'RELEASE_CHECKLIST.md'),
  path.join(projectRoot, 'LAUNCH_CANDIDATE_GUIDE.md'),
  path.join(projectRoot, 'docs', 'frontend-phase25-notes.md'),
];

const requiredFiles = [
  path.join(projectRoot, 'src', 'server.js'),
  path.join(projectRoot, 'frontend', 'src', 'components', 'system', 'backend-health-badge.tsx'),
  path.join(projectRoot, 'frontend', 'src', 'components', 'system', 'system-status-banner.tsx'),
];

let failed = false;
for (const file of [...requiredDocs, ...requiredFiles]) {
  if (!fs.existsSync(file)) {
    console.error(`[release-audit] missing: ${path.relative(projectRoot, file)}`);
    failed = true;
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const frontendPackageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'frontend', 'package.json'), 'utf8'));

for (const scriptName of ['syntax:check', 'smoke-test', 'frontend:build']) {
  if (!packageJson.scripts?.[scriptName]) {
    console.error(`[release-audit] missing root script: ${scriptName}`);
    failed = true;
  }
}

for (const scriptName of ['build', 'qa:phase23', 'qa:release']) {
  if (!frontendPackageJson.scripts?.[scriptName]) {
    console.error(`[release-audit] missing frontend script: ${scriptName}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('[release-audit] ok');
