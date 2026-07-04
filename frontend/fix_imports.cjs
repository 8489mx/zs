const fs = require('fs');
['src/features/manufacturing/pages/NewBomPage.tsx', 'src/features/manufacturing/pages/EditBomPage.tsx'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('inventoryApi')) {
    content = content.replace(/import \{ productsApi \} from '@\/features\/products';/, "import { productsApi } from '@/features/products';\nimport { inventoryApi } from '@/features/inventory/api/inventory.api';");
    fs.writeFileSync(f, content);
  }
});
console.log('done imports 3');
