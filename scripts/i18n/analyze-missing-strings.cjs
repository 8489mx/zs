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

const stringsByWordCount = { 1: 0, 2: 0, 3: 0, 4: 0, '5-10': 0, '11+': 0 };
const uniqueArabic = new Set();

for (const k of missingKeys) {
  const text = (flatAr[k] || '').trim();
  if (!text) continue;
  uniqueArabic.add(text);
}

for (const text of uniqueArabic) {
  const words = text.split(/\s+/).length;
  if (words === 1) stringsByWordCount[1]++;
  else if (words === 2) stringsByWordCount[2]++;
  else if (words === 3) stringsByWordCount[3]++;
  else if (words === 4) stringsByWordCount[4]++;
  else if (words <= 10) stringsByWordCount['5-10']++;
  else stringsByWordCount['11+']++;
}

console.log('Total unique strings to translate:', uniqueArabic.size);
console.log('Breakdown by word count:', stringsByWordCount);
