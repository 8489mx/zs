#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [
  '.env.example',
  'BACKUP_RESTORE.md',
  'MONITORING_READINESS.md',
  'DEPLOYMENT_RUNBOOK.md',
  'GO_LIVE_GATE.md',
  'PERMISSIONS_AUDIT.md',
  'RELEASE_GATE_FINAL.md',
  'PRE_SALE_HARDENING.md',
  'PHASE12_FINANCIAL_INTEGRITY.md',
  'PHASE13_CRITICAL_FLOW_CONFIDENCE.md',
  'PHASE14_OPERATIONS_READINESS.md',
  'PHASE15_FINAL_COMMERCIAL_POLISH.md',
  'scripts/check-go-live.cjs',
  'scripts/check-permissions-audit.cjs',
  'scripts/verify-readiness.cjs',
  'test/critical/financial-integrity.spec.ts',
  'test/critical/session-auth.spec.ts',
];

const missing = checks.filter((entry) => !fs.existsSync(path.join(root, entry)));
if (missing.length) {
  console.error('[check:commercial-ready] missing required release assets:');
  for (const entry of missing) console.error(` - ${entry}`);
  process.exit(1);
}

console.log('[check:commercial-ready] release assets and critical verification files are present');
