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
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('frontend/src');
// Match word-boundary t or __t
const tRegex = /\b(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;

let foundInCode = 0;
let missingInEn = 0;
let translatedFromCache = 0;
let unhandled = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    foundInCode++;
    const key = match[1];
    const defArabic = match[2].trim();
    if (!arabicRe.test(defArabic)) continue;

    if (!flatEn[key] || arabicRe.test(flatEn[key])) {
      missingInEn++;
      const tr = cache[defArabic] || uiDict[defArabic];
      if (tr && typeof tr === 'string' && !arabicRe.test(tr)) {
        flatEn[key] = tr;
        translatedFromCache++;
      } else {
        unhandled.push({ key, defArabic, file: path.relative('frontend/src', file) });
      }
    }
  }
}

console.log('Total t(key, "arabic") found in code:', foundInCode);
console.log('Of those, missing in en.json:', missingInEn);
console.log('Successfully resolved from cache/dict into en.json:', translatedFromCache);
console.log('Still unhandled:', unhandled.length);

if (translatedFromCache > 0) {
  const newEn = unflatten(flatEn);
  fs.writeFileSync('frontend/src/locales/en.json', JSON.stringify(newEn, null, 2), 'utf8');
  console.log('Saved resolved keys into en.json!');
}

if (unhandled.length > 0) {
  console.log('Sample unhandled:');
  for (const item of unhandled.slice(0, 15)) {
    console.log(`[${item.file}] ${item.key} => "${item.defArabic}"`);
  }
}
