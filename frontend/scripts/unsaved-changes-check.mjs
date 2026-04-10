import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src');
const targets = [
  'features/sales/components/SaleEditDialog.tsx',
  'features/purchases/components/PurchaseEditDialog.tsx',
  'features/purchases/components/PurchaseComposer.tsx',
  'features/inventory/components/InventoryActionsPanel.tsx'
];

const failures = [];
for (const relativePath of targets) {
  const absolutePath = path.join(root, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  if (!content.includes('use-unsaved-changes-guard')) failures.push(`${relativePath}: missing useUnsavedChangesGuard`);
  if (!content.includes('unsaved-changes-notice')) failures.push(`${relativePath}: missing UnsavedChangesNotice`);
}

if (failures.length) {
  console.error('Phase 22 unsaved-changes QA failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Phase 22 unsaved-changes QA passed.');
