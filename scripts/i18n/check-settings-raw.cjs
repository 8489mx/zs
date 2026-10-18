const fs = require('fs');
const path = require('path');

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

const settingsFiles = walk('frontend/src/features/settings');
const arabicRe = /[\u0600-\u06FF]/;

for (const file of settingsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const withoutT = stripped.replace(/\b(?:t|__t)\s*\([^)]*\)/g, '');
  if (arabicRe.test(withoutT)) {
    const lines = withoutT.split('\n');
    const raw = [];
    for (let i = 0; i < lines.length; i++) {
      if (arabicRe.test(lines[i])) {
        raw.push({ line: i + 1, text: lines[i].trim() });
      }
    }
    if (raw.length > 0) {
      console.log(`[${path.relative('frontend/src/features/settings', file)}] (${raw.length} lines):`);
      for (const r of raw.slice(0, 5)) {
        console.log(`  L${r.line}: ${r.text}`);
      }
    }
  }
}
