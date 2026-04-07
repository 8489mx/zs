const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');
const requiredRepoFiles = [
  'README.md',
  'CHANGELOG_PHASES.md',
  'FINAL_VERDICT.md',
  'KNOWN_GAPS.md',
  'ROADMAP_TO_95.md',
  'CLIENT_HANDOFF.md',
];
const requiredBackendFiles = [
  'PRODUCTION_CHECKLIST.md',
  'BACKUP_RESTORE.md',
  'MONITORING_READINESS.md',
  'DEPLOYMENT_RUNBOOK.md',
  'PERMISSIONS_AUDIT.md',
  'RELEASE_GATE_FINAL.md',
  'GO_LIVE_GATE.md',
  '.env.example',
];

const requiredEnvKeys = [
  'NODE_ENV',
  'PORT',
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'CORS_ORIGINS',
  'COOKIE_SECURE',
  'COOKIE_SAME_SITE',
  'DEFAULT_ADMIN_PASSWORD',
];

function assertFile(base, rel) {
  const full = path.join(base, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${rel}`);
  }
}

for (const file of requiredRepoFiles) assertFile(repoRoot, file);
for (const file of requiredBackendFiles) assertFile(backendRoot, file);

const envExample = fs.readFileSync(path.join(backendRoot, '.env.example'), 'utf8');
for (const key of requiredEnvKeys) {
  if (!envExample.includes(`${key}=`)) {
    throw new Error(`Missing env.example key: ${key}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf8'));
const requiredScripts = ['build', 'test:infra', 'check:readiness', 'check:permissions', 'check:release-gate'];
for (const script of requiredScripts) {
  if (!pkg.scripts || !pkg.scripts[script]) {
    throw new Error(`Missing package.json script: ${script}`);
  }
}

console.log('[check:go-live] repository handoff files, env template, and release scripts look ready.');
