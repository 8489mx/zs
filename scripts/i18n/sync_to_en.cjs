const fs = require('fs');

const ar = JSON.parse(fs.readFileSync('frontend/src/locales/ar.json', 'utf8'));
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

const flatAr = flatten(ar);
const flatEn = flatten(en);
const arabicRe = /[\u0600-\u06FF]/;

let injectedCount = 0;
for (const [k, arVal] of Object.entries(flatAr)) {
  const enVal = flatEn[k];
  if (!enVal || arabicRe.test(enVal)) {
    if (typeof arVal === 'string' && arVal.trim()) {
      const tr = cache[arVal.trim()];
      if (tr && typeof tr === 'string' && !arabicRe.test(tr)) {
        flatEn[k] = tr;
        injectedCount++;
      }
    }
  }
}

const newEn = unflatten(flatEn);
fs.writeFileSync('frontend/src/locales/en.json', JSON.stringify(newEn, null, 2), 'utf8');

let dictAdded = 0;
for (const [k, v] of Object.entries(cache)) {
  if (k && v && typeof v === 'string' && !arabicRe.test(v)) {
    if (!uiDict[k]) {
      uiDict[k] = v;
      dictAdded++;
    }
  }
}
fs.writeFileSync('frontend/src/lib/ui-dictionary.json', JSON.stringify(uiDict, null, 2), 'utf8');

console.log(`Sync complete: Injected ${injectedCount} new translations. Total en.json keys: ${Object.keys(flatEn).length} / ${Object.keys(flatAr).length}`);
