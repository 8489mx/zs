const fs = require('fs');

const ar = JSON.parse(fs.readFileSync('frontend/src/locales/ar.json', 'utf8'));
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

const flatAr = flatten(ar);
const flatEn = flatten(en);
const missingKeys = Object.keys(flatAr).filter(k => !flatEn[k] || flatEn[k].trim() === '');

const uniqueArabic = new Set();
for (const k of missingKeys) {
  const text = (flatAr[k] || '').trim();
  if (text) uniqueArabic.add(text);
}

console.log('Unique Arabic strings:', uniqueArabic.size);

// Load ui-dictionary.json
const uiDict = JSON.parse(fs.readFileSync('frontend/src/lib/ui-dictionary.json', 'utf8'));

// Build comprehensive base dictionary
const baseDict = new Map();
for (const [k, v] of Object.entries(uiDict)) {
  if (k && v && typeof v === 'string') {
    baseDict.set(k.trim(), v.trim());
  }
}

// Check coverage with uiDict
let matched = 0;
let unmatched = [];
for (const text of uniqueArabic) {
  if (baseDict.has(text)) {
    matched++;
  } else {
    unmatched.push(text);
  }
}

console.log('Matched in uiDict directly:', matched);
console.log('Unmatched:', unmatched.length);
console.log('Sample unmatched (first 25):', unmatched.slice(0, 25));
