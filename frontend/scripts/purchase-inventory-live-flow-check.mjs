import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'src/features/purchases/components/PurchaseComposer.tsx',
  'src/features/purchases/hooks/useCreatePurchaseMutation.ts',
  'src/features/purchases/hooks/usePurchaseComposerCatalog.ts',
  'src/features/purchases/contracts.ts',
  'src/features/purchases/schemas/purchase.schema.ts',
  'src/features/inventory/components/InventoryActionsPanel.tsx',
  'src/features/inventory/hooks/useInventoryActionCatalog.ts',
  'src/features/inventory/hooks/useInventoryMutations.ts',
  'src/features/inventory/contracts.ts',
  'src/features/inventory/schemas/inventory.schema.ts'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing live-flow files:\n' + missing.join('\n'));
  process.exit(1);
}

const purchasesPage = fs.readFileSync(path.join(root, 'src/features/purchases/pages/PurchasesPage.tsx'), 'utf8');
const inventoryPage = fs.readFileSync(path.join(root, 'src/features/inventory/pages/InventoryPage.tsx'), 'utf8');
const salesPage = fs.readFileSync(path.join(root, 'src/features/sales/pages/SalesPage.tsx'), 'utf8');

for (const [name, content, token] of [
  ['PurchasesPage', purchasesPage, 'PurchaseComposer'],
  ['InventoryPage', inventoryPage, 'InventoryActionsPanel'],
  ['SalesPage', salesPage, 'Route Guard']
]) {
  if (!content.includes(token)) {
    console.error(`${name} is missing required token: ${token}`);
    process.exit(1);
  }
}

console.log('purchase-inventory-live-flow-check passed');
