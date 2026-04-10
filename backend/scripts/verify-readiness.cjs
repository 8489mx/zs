const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exists(base, relPath) {
  return fs.existsSync(path.join(base, relPath));
}

function read(base, relPath) {
  return fs.readFileSync(path.join(base, relPath), 'utf8');
}

const requiredBackendFiles = [
  '.env.example',
  'README-STRUCTURE.md',
  'PRODUCTION_CHECKLIST.md',
  'PRE_SALE_HARDENING.md',
  'PHASE12_FINANCIAL_INTEGRITY.md',
  'PHASE13_CRITICAL_FLOW_CONFIDENCE.md',
  'PHASE14_OPERATIONS_READINESS.md',
  'BACKUP_RESTORE.md',
  'MONITORING_READINESS.md',
  'scripts/check-architecture-guardrails.cjs',
  'src/common/utils/location-stock-ledger.ts',
  'src/database/migrations/1710000006000-location-stock-ledger.ts',
  'test/critical/bootstrap-admin-safety.spec.ts',
  'test/critical/financial-integrity.spec.ts',
  'test/critical/login-rate-limit.spec.ts',
  'test/critical/operational-flows.spec.ts',
  'test/critical/session-auth.guard.spec.ts',
  'test/critical/session-auth.spec.ts',
  'test/e2e/auth-session.e2e.ts',
  'test/e2e/catalog-master-data.e2e.ts',
  'test/e2e/commercial-flows.e2e.ts',
  'test/infra/auth.dto.spec.ts',
];

for (const relPath of requiredBackendFiles) {
  assert(exists(backendRoot, relPath), `Missing readiness asset: ${relPath}`);
}

const backendPkg = JSON.parse(read(backendRoot, 'package.json'));
const requiredBackendScripts = [
  'build',
  'typecheck',
  'test:infra',
  'test:critical',
  'test:auth',
  'test:e2e',
  'check:architecture',
  'check:readiness',
  'check:permissions',
  'check:env-safety',
  'check:release-gate',
  'check:go-live',
  'check:commercial-ready',
];

for (const scriptName of requiredBackendScripts) {
  assert(backendPkg.scripts && backendPkg.scripts[scriptName], `Missing backend package script: ${scriptName}`);
}

const repoPkg = JSON.parse(read(repoRoot, 'package.json'));
const requiredRepoScripts = [
  'install:all',
  'build',
  'qa',
  'qa:backend',
  'qa:frontend',
  'compose:e2e',
  'qa:release',
  'e2e:self',
  'package:clean',
  'qa:sale-ready',
];

for (const scriptName of requiredRepoScripts) {
  assert(repoPkg.scripts && repoPkg.scripts[scriptName], `Missing repo package script: ${scriptName}`);
}

const envExample = read(backendRoot, '.env.example');
for (const key of [
  'NODE_ENV',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'SESSION_CSRF_SECRET',
  'SESSION_COOKIE_SECURE',
  'ALLOW_SESSION_ID_HEADER',
  'ENABLE_BOOTSTRAP_ADMIN',
  'ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION',
  'DEFAULT_ADMIN_USERNAME',
  'DEFAULT_ADMIN_PASSWORD',
  'LOGIN_RATE_LIMIT_MAX',
  'AUTH_BURST_RATE_LIMIT_MAX',
]) {
  assert(envExample.includes(`${key}=`), `Missing backend/.env.example key: ${key}`);
}

const certifySaleReady = read(repoRoot, 'scripts/certify-sale-ready.sh');
assert(certifySaleReady.includes('npm run qa'), 'Sale-ready certification script must run the full QA suite');
assert(certifySaleReady.includes('test:e2e'), 'Sale-ready certification script must run backend E2E tests');
assert(certifySaleReady.includes('health/ready'), 'Sale-ready certification script must wait for readiness endpoint');
assert(certifySaleReady.includes('package:clean'), 'Sale-ready certification script must package a clean release');

const localE2E = read(repoRoot, 'scripts/run-backend-e2e-local.sh');
assert(localE2E.includes('health/ready'), 'Local E2E helper must wait for readiness endpoint');
assert(localE2E.includes('test:e2e'), 'Local E2E helper must execute backend E2E tests');

console.log('Readiness assets, scripts, and release wiring verified.');
