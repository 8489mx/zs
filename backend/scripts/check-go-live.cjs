const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const requiredBackendFiles = [
  'PRODUCTION_CHECKLIST.md',
  'BACKUP_RESTORE.md',
  'MONITORING_READINESS.md',
  'DEPLOYMENT_RUNBOOK.md',
  'PERMISSIONS_AUDIT.md',
  'RELEASE_GATE_FINAL.md',
  'GO_LIVE_GATE.md',
  'PRE_SALE_HARDENING.md',
  'PHASE12_FINANCIAL_INTEGRITY.md',
  'PHASE13_CRITICAL_FLOW_CONFIDENCE.md',
  'PHASE14_OPERATIONS_READINESS.md',
  'PHASE15_FINAL_COMMERCIAL_POLISH.md',
  '.env.example',
];

const requiredEnvKeys = [
  'NODE_ENV',
  'APP_HOST',
  'APP_PORT',
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'CORS_ORIGINS',
  'SESSION_COOKIE_SECURE',
  'SESSION_COOKIE_SAME_SITE',
  'SESSION_CSRF_SECRET',
  'ALLOW_SESSION_ID_HEADER',
  'ENABLE_BOOTSTRAP_ADMIN',
  'DEFAULT_ADMIN_PASSWORD',
  'LOGIN_RATE_LIMIT_MAX',
  'AUTH_BURST_RATE_LIMIT_MAX',
];

function assertFile(base, rel) {
  const full = path.join(base, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${rel}`);
  }
}

for (const file of requiredBackendFiles) assertFile(backendRoot, file);

const envExample = fs.readFileSync(path.join(backendRoot, '.env.example'), 'utf8');
for (const key of requiredEnvKeys) {
  if (!envExample.includes(`${key}=`)) {
    throw new Error(`Missing env.example key: ${key}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf8'));
const requiredScripts = ['build', 'test:infra', 'check:readiness', 'check:permissions', 'check:env-safety', 'check:release-gate'];
for (const script of requiredScripts) {
  if (!pkg.scripts || !pkg.scripts[script]) {
    throw new Error(`Missing package.json script: ${script}`);
  }
}

console.log('[check:go-live] backend handoff files, env template, and release scripts look ready.');
