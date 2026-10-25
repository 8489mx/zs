#!/usr/bin/env node
// Advisory: conservative discovery of code drift after each evidence SHA.
// Does not certify code or automatically mutate the review register.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const register = JSON.parse(fs.readFileSync(path.join(root, 'docs/reviews/module-review-status.json'), 'utf8'));
const strict = process.argv.includes('--strict');
const baseline = register.baseline_code_commit;
const broad = [
  'backend/src/common/', 'backend/src/core/', 'backend/src/config/',
  'backend/src/database/', 'backend/src/modules/accounting/',
  'backend/src/modules/inventory/', 'backend/src/modules/catalog/',
  'backend/src/modules/partners/', 'backend/src/modules/settings/',
  'frontend/src/app/', 'frontend/src/shared/', 'frontend/src/lib/',
  'frontend/electron/', 'portable/', 'android-app/', 'android-app-lite/',
  '.github/workflows/', 'deploy/'
];
const aliases = {
  catalog: ['products'], partners: ['accounts', 'customers', 'suppliers'],
  users: ['auth'], sessions: ['auth'], public: ['public-trial'],
  addons: ['pos', 'products'], bosta: ['storefront'], 'gcc-shipping': ['storefront'],
  pricing: ['pricing-center'], 'tenant-subscription': ['saas-admin', 'settings'],
  'manager-actions': ['approvals'], inventory: ['products'],
  sales: ['pos'], reports: ['dashboard'], settings: ['apps-store', 'updates']
};
const cache = new Map();
function changedSince(ref) {
  if (cache.has(ref)) return cache.get(ref);
  if (!/^[0-9a-f]{40}$/.test(ref || '')) throw new Error('Invalid base SHA: ' + ref);
  const output = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', ref + '..HEAD', '--'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  const changes = output.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  cache.set(ref, changes);
  return changes;
}
function impacts(m, file) {
  if (broad.some(prefix => file.startsWith(prefix))) return true;
  if (file.startsWith('backend/src/modules/' + m + '/')) return true;
  const features = [m, ...(aliases[m] || [])];
  return features.some(f => file.startsWith('frontend/src/features/' + f + '/'));
}
let staleVerified = 0;
const unmapped = new Set();
const baselineChanged = changedSince(baseline);
console.log('SYSTEM MAP DRIFT (advisory; not test or release evidence)');
console.log('Baseline: ' + baseline + ' | Code changes since baseline: ' + baselineChanged.length);
for (const m of register.modules) {
  const ref = m.last_verified_commit || baseline;
  const changes = changedSince(ref).filter(file => impacts(m.module, file));
  const verified = m.state === 'verified_scoped' || m.state === 'release_ready';
  if (verified && changes.length) staleVerified++;
  console.log(m.module + ' | state=' + m.state + ' | since=' + ref.slice(0, 10) +
    ' | candidate_changes=' + changes.length + (verified && changes.length ? ' | REVALIDATION REQUIRED' : ''));
  if (changes.length) console.log('  ' + changes.slice(0, 8).join(', ') + (changes.length > 8 ? ' ...' : ''));
}
for (const file of baselineChanged) {
  if (!file.startsWith('backend/src/') && !file.startsWith('frontend/src/')) continue;
  if (!register.modules.some(m => impacts(m.module, file))) unmapped.add(file);
}
if (unmapped.size) {
  console.log('Unmapped code: manually assign consumers; not a clean bill of health.');
  for (const file of [...unmapped].slice(0, 30)) console.log('  ' + file);
}
console.log('WARNING: changes in dependency consumers, raw SQL, migrations or unlisted paths may be missed.');
console.log('No-change is NEVER evidence of safe behavior; check latest HEAD and actual test/UAT results.');
if (strict && staleVerified) {
  console.error('Strict review drift: ' + staleVerified + ' previously verified module states need revalidation.');
  process.exitCode = 1;
}
