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

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== '.git') {
        files.push(...walk(full));
      }
    } else if (item.endsWith('.tsx') && !item.includes('.spec.') && !item.includes('.test.')) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk('frontend/src');
console.log('Total TSX files across frontend/src:', allFiles.length);

const tRegex = /\b(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\)/g;

let totalKeys = 0;
let translatedKeys = 0;
let untranslatedFiles = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  let fileTotal = 0;
  let fileTr = 0;
  let missing = [];

  while ((match = tRegex.exec(content)) !== null) {
    fileTotal++;
    totalKeys++;
    const key = match[1];
    const enVal = flatEn[key];
    if (enVal && typeof enVal === 'string' && !arabicRe.test(enVal)) {
      fileTr++;
      translatedKeys++;
    } else {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    untranslatedFiles.push({ file: path.relative('frontend/src', file), missing: missing.length, total: fileTotal, keys: missing });
  }
}

console.log('=== SYSTEM-WIDE I18N AUDIT ===');
console.log('Total keys across entire system:', totalKeys);
console.log('Translated keys in en.json:', translatedKeys, '(' + (translatedKeys / (totalKeys || 1) * 100).toFixed(2) + '%)');
console.log('Files with any missing keys:', untranslatedFiles.length);
if (untranslatedFiles.length > 0) {
  console.log('Files with missing keys sample:');
  for (const p of untranslatedFiles.slice(0, 10)) {
    console.log(`  [${p.file}] missing ${p.missing}/${p.total}:`, p.keys);
  }
}
