import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/features');

const requiredFiles = [
  'pos/contracts.ts',
  'pos/hooks/usePosSaleMutation.ts',
  'pos/pages/PosPage.tsx',
  'pos/hooks/usePosWorkspace.ts',
  'accounts/contracts.ts',
  'accounts/hooks/useAccountingMutations.ts',
  'settings/contracts.ts',
  'settings/hooks/useSettingsMutations.ts',
  'settings/hooks/useSettingsAdminWorkspace.ts'
];

const checks = requiredFiles.map((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  return { relativePath, exists: fs.existsSync(absolutePath) };
});

const missing = checks.filter((item) => !item.exists);
if (missing.length) {
  console.error('Missing critical flow files:');
  for (const item of missing) console.error(` - ${item.relativePath}`);
  process.exit(1);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(relativePath, pattern, label) {
  const content = read(relativePath);
  if (!content.includes(pattern)) {
    console.error(`Expected ${label} in ${relativePath}`);
    process.exit(1);
  }
}

function assertIncludesAny(candidates, pattern, label) {
  for (const relativePath of candidates) {
    if (read(relativePath).includes(pattern)) {
      return;
    }
  }
  console.error(`Expected ${label} in one of: ${candidates.join(', ')}`);
  process.exit(1);
}

assertIncludes('pos/hooks/usePosSaleMutation.ts', 'buildPosSalePayload', 'POS payload builder usage');
assertIncludesAny(['pos/hooks/usePosWorkspace.ts', 'pos/components/PosWorkspace.tsx'], 'expectedTotal: totals.total', 'POS expected total wiring');
assertIncludes('pos/pages/PosPage.tsx', '<PosWorkspace />', 'POS route wrapper composition');
assertIncludes('accounts/hooks/useAccountingMutations.ts', 'buildCustomerPaymentPayload', 'customer payment payload builder usage');
assertIncludes('accounts/hooks/useAccountingMutations.ts', 'buildSupplierPaymentPayload', 'supplier payment payload builder usage');
assertIncludes('settings/hooks/useSettingsMutations.ts', 'buildSettingsUpdatePayload', 'settings payload builder usage');
assertIncludes('settings/hooks/useSettingsMutations.ts', 'buildBranchPayload', 'branch payload builder usage');
assertIncludes('settings/hooks/useSettingsMutations.ts', 'buildLocationPayload', 'location payload builder usage');
assertIncludes('settings/hooks/useSettingsAdminWorkspace.ts', 'useSettingsRouteState', 'settings route state orchestration');

console.log('critical-flow-check: OK');
