const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) r.push(...walk(f));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) r.push(f);
  }
  return r;
}

const files = walk('frontend/src/features/returns');
const keys = {};
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const regex = /t\(['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/g;
  let match;
  while ((match = regex.exec(c)) !== null) {
    keys[match[1]] = match[2] || '';
  }
}
console.log(JSON.stringify(keys, null, 2));
