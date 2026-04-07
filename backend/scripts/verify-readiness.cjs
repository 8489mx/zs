const fs = require('fs');
const path = require('path');

const required = [
  '.env.example',
  'README-STRUCTURE.md',
  'PRODUCTION_CHECKLIST.md',
  'PRE_SALE_HARDENING.md',
  'PHASE12_FINANCIAL_INTEGRITY.md',
  'PHASE13_CRITICAL_FLOW_CONFIDENCE.md',
  'PHASE14_OPERATIONS_READINESS.md',
  'BACKUP_RESTORE.md',
  'MONITORING_READINESS.md',
];

const missing = required.filter((file) => !fs.existsSync(path.join(process.cwd(), file)));
if (missing.length) {
  console.error('Missing readiness files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}
console.log('Readiness files verified.');
