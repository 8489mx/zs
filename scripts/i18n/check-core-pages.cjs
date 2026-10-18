const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('frontend/src/locales/en.json', 'utf8'));

function flatten(obj, prefix = '') {
  let res = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(res, flatten(v, full));
    } else {
      res[full] = v;
    }
  }
  return res;
}

const flatEn = flatten(en);
const arabicRe = /[\u0600-\u06FF]/;

const coreFiles = [
  'frontend/src/features/settings/pages/SettingsPage.tsx',
  'frontend/src/features/settings/components/forms/SettingsMainForm.tsx',
  'frontend/src/features/products/components/ProductsWorkspace.tsx',
  'frontend/src/features/products/components/ProductForm.tsx',
  'frontend/src/features/sales/pages/SalesPage.tsx',
  'frontend/src/features/customers/pages/CustomersPage.tsx',
  'frontend/src/features/returns/components/ReturnsWorkspace.tsx'
];

// Strict regex matching only t('key' or __t('key'
const tRegex = /\b(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\)/g;

for (const file of coreFiles) {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  let match;
  let totalInFile = 0;
  let translatedInEn = 0;
  let missingKeys = [];

  while ((match = tRegex.exec(content)) !== null) {
    totalInFile++;
    const key = match[1];
    const def = match[2] || '';
    const enVal = flatEn[key];
    if (enVal && typeof enVal === 'string' && !arabicRe.test(enVal)) {
      translatedInEn++;
    } else {
      missingKeys.push({ key, def, enVal });
    }
  }
  console.log(`[${path.basename(file)}] ${translatedInEn}/${totalInFile} keys translated (${(translatedInEn / (totalInFile || 1) * 100).toFixed(1)}%)`);
  if (missingKeys.length > 0) {
    console.log(`   Missing in ${path.basename(file)}:`, missingKeys);
  }
}
