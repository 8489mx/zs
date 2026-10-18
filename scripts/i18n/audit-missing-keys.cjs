const fs = require('fs');
const path = require('path');

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
console.log('Total ts/tsx files in frontend/src:', files.length);

const tCallRegex = /(?:^|[^a-zA-Z0-9_])(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?/g;

let totalTCalls = 0;
let missingInEn = new Map();
let keysCalledInCode = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    totalTCalls++;
    const key = match[1];
    const defaultVal = match[2] || '';
    keysCalledInCode.add(key);
    if (!flatEn[key]) {
      missingInEn.set(key, { defaultVal, file: path.relative('frontend/src', file) });
    }
  }
}

console.log('Total t() / __t() calls found in codebase:', totalTCalls);
console.log('Unique keys called in codebase:', keysCalledInCode.size);
console.log('Unique keys called in codebase that are MISSING in en.json:', missingInEn.size);

let sampleCount = 0;
console.log('\n--- SAMPLE MISSING KEYS IN EN.JSON CALLED IN CODE ---');
for (const [k, meta] of missingInEn.entries()) {
  if (sampleCount++ < 30) {
    console.log(`[${meta.file}] ${k} => "${meta.defaultVal}"`);
  }
}
