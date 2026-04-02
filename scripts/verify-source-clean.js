#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const forbidden = [
  '.env',
  '.env.production',
  'node_modules',
  path.join('frontend', 'node_modules'),
  path.join('data', 'zstore.db'),
];

const issues = forbidden.filter((entry) => fs.existsSync(path.join(root, entry)));
if (issues.length) {
  console.error('[source-clean] forbidden source artifacts found:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log('[source-clean] workspace is clean.');
