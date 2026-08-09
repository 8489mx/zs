const fs = require('fs');
['src/features/manufacturing/pages/NewBomPage.tsx', 'src/features/manufacturing/pages/EditBomPage.tsx'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/fetchOptions=\{async \(q\) => \{\n {22}const res = await productsApi\.list\(\{ q, pageSize: 50 \}\);\n {22}return res\.data\.filter\(p => p\.itemType !== 'raw_material'\);\n {20}\}\}/g, "fetchOptions={async (q) => {\n                      const res = await inventoryApi.searchProducts(q);\n                      return res.filter(p => p.itemType !== 'raw_material');\n                    }}");
  content = content.replace(/fetchOptions=\{async \(q\) => \{\n {32}const res = await componentsApi\.searchComponents\(q\);\n {32}return res\.data;\n {30}\}\}/g, "fetchOptions={async (q) => {\n                                const res = await componentsApi.searchComponents(q);\n                                return res;\n                              }}");
  fs.writeFileSync(f, content);
});
console.log('done');
