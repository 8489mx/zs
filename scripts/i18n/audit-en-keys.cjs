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
const tRegex = /(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*(['"])(.*?)\2)?/g;

let calledKeys = new Map();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    const defaultVal = match[3] || '';
    if (!calledKeys.has(key)) {
      calledKeys.set(key, { defaultVal, file: path.relative('frontend/src', file).replace(/\\/g, '/') });
    }
  }
}

console.log('Total unique keys called in code:', calledKeys.size);

const notInEn = [];
const arabicInEn = [];
for (const [k, info] of calledKeys.entries()) {
  const val = flatEn[k];
  if (val === undefined) {
    notInEn.push({ key: k, defaultVal: info.defaultVal, file: info.file });
  } else if (typeof val === 'string' && /[\u0600-\u06FF]/.test(val)) {
    arabicInEn.push({ key: k, val: val, defaultVal: info.defaultVal, file: info.file });
  }
}

console.log('Keys called in code that are NOT in en.json:', notInEn.length);
console.log('Keys in en.json that have ARABIC value in en.json:', arabicInEn.length);
if (notInEn.length > 0) {
  console.log('Sample not in en.json (first 15):');
  notInEn.slice(0, 15).forEach(x => console.log(' ', x.file, ':', x.key, '-> default:', x.defaultVal));
}
if (arabicInEn.length > 0) {
  console.log('Sample arabic in en.json (first 15):');
  arabicInEn.slice(0, 15).forEach(x => console.log(' ', x.file, ':', x.key, '-> val:', x.val));
}
