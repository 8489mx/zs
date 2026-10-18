const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('frontend/src/locales/en.json', 'utf8'));
const cache = JSON.parse(fs.readFileSync('scripts/i18n/translation_cache.json', 'utf8'));
const uiDict = JSON.parse(fs.readFileSync('frontend/src/lib/ui-dictionary.json', 'utf8'));

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

function unflatten(flat) {
  const result = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let cur = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return result;
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
const tRegex = /\b(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\)/g;

let missingList = [];
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    const def = match[2] || '';
    if (!flatEn[key] || arabicRe.test(flatEn[key])) {
      missingList.push({ key, def, file: path.relative('frontend/src', file) });
    }
  }
}

console.log('Total missing instances:', missingList.length);

const uniqueMissing = new Map();
for (const item of missingList) {
  if (!uniqueMissing.has(item.key)) {
    uniqueMissing.set(item.key, item.def);
  }
}

console.log('Unique missing keys:', uniqueMissing.size);

// Try to resolve from cache or dict
let resolved = 0;
let stillNeed = [];
for (const [key, def] of uniqueMissing.entries()) {
  const trimmed = (def || '').trim();
  const tr = cache[trimmed] || uiDict[trimmed];
  if (tr && typeof tr === 'string' && !arabicRe.test(tr)) {
    flatEn[key] = tr;
    resolved++;
  } else {
    stillNeed.push({ key, def });
  }
}

console.log('Resolved from cache/dict:', resolved);
console.log('Still need translation:', stillNeed.length);
if (stillNeed.length > 0) {
  console.log('Sample still need:', stillNeed.slice(0, 20));
}

const newEn = unflatten(flatEn);
fs.writeFileSync('frontend/src/locales/en.json', JSON.stringify(newEn, null, 2), 'utf8');
