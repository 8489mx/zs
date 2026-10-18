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
    } else if (item.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('frontend/src');
const arabicRegex = /[\u0600-\u06FF]/;

// Check which files have Arabic text NOT inside t('...', '...') or comments
let filesWithRawArabic = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // strip comments
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  // strip t(...) or __t(...)
  const withoutT = stripped.replace(/(?:t|__t)\s*\([^)]*\)/g, '');

  if (arabicRegex.test(withoutT)) {
    // find lines with raw arabic
    const lines = withoutT.split('\n');
    let rawLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (arabicRegex.test(lines[i])) {
        rawLines.push({ lineNum: i + 1, text: lines[i].trim() });
      }
    }
    if (rawLines.length > 0) {
      filesWithRawArabic.push({ file: path.relative('frontend/src', file), rawLines });
    }
  }
}

console.log('Total TSX files:', files.length);
console.log('Files with raw Arabic outside t():', filesWithRawArabic.length);
console.log('\n--- SAMPLE FILES WITH RAW ARABIC ---');
for (const item of filesWithRawArabic.slice(0, 15)) {
  console.log(`[${item.file}] (${item.rawLines.length} lines)`);
  for (const line of item.rawLines.slice(0, 3)) {
    console.log(`  L${line.lineNum}: ${line.text}`);
  }
}
