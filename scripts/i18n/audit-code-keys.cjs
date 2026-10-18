const fs = require('fs');
const path = require('path');

const ar = JSON.parse(fs.readFileSync('frontend/src/locales/ar.json', 'utf8'));

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
const tRegex = /(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?/g;

let calledKeys = new Map();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    const defaultVal = match[2] || '';
    if (!calledKeys.has(key)) {
      calledKeys.set(key, defaultVal);
    }
  }
}

console.log('Total unique keys called in code:', calledKeys.size);

const notInAr = [];
for (const [k, defVal] of calledKeys.entries()) {
  if (!flatAr[k]) {
    notInAr.push({ key: k, defaultVal: defVal });
  }
}

console.log('Keys called in code that are NOT in ar.json:', notInAr.length);
console.log('Sample not in ar.json (first 20):');
for (const item of notInAr.slice(0, 20)) {
  console.log(item.key, '=> default:', item.defaultVal);
}
