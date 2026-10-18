const fs = require('fs');

const en = JSON.parse(fs.readFileSync('frontend/src/locales/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('frontend/src/locales/ar.json', 'utf8'));
const cache = JSON.parse(fs.readFileSync('scripts/i18n/translation_cache.json', 'utf8'));

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

const flatAr = flatten(ar);
const flatEn = flatten(en);

// Remove colliding top-level string keys
delete flatEn['purchases'];
delete flatEn['sales'];
delete flatEn['products'];
delete flatEn['customers'];
delete flatEn['settings'];
delete flatEn['inventory'];
delete flatEn['accounting'];

const arabicRe = /[\u0600-\u06FF]/;

// Ensure all ar.json keys are in flatEn
let fixedCount = 0;
for (const [k, arVal] of Object.entries(flatAr)) {
  if (!flatEn[k] || arabicRe.test(flatEn[k])) {
    if (typeof arVal === 'string' && arVal.trim()) {
      const tr = cache[arVal.trim()];
      if (tr && typeof tr === 'string' && !arabicRe.test(tr)) {
        flatEn[k] = tr;
        fixedCount++;
      }
    }
  }
}

console.log(`Fixed ${fixedCount} keys in flatEn.`);

const newEn = unflatten(flatEn);
fs.writeFileSync('frontend/src/locales/en.json', JSON.stringify(newEn, null, 2), 'utf8');
console.log('Successfully re-saved en.json without collision!');
