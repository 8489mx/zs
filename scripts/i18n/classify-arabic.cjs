const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'locales') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const arabicRegex = /[\u0600-\u06FF]/;
const files = walk('frontend/src');
const dict = JSON.parse(fs.readFileSync('frontend/src/lib/ui-dictionary.json', 'utf8'));

let inDictCount = 0;
let notInDictCount = 0;
const notInDictSamples = [];
const notInDictSet = new Set();

for (const file of files) {
  if (file.includes('.spec.') || file.includes('.test.') || file.includes('ui-dictionary.json')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (arabicRegex.test(line)) {
      // Find strings inside quotes or JSX text
      const regex = /(["'`])((?:(?!\1)[^\\]|\\.)*?[\u0600-\u06FF](?:(?!\1)[^\\]|\\.)*?)\1|>([^<]*?[\u0600-\u06FF][^<]*?)</g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        const raw = (m[2] || m[3] || '').trim();
        if (raw && arabicRegex.test(raw)) {
          if (dict[raw]) {
            inDictCount++;
          } else {
            notInDictCount++;
            if (!notInDictSet.has(raw)) {
              notInDictSet.add(raw);
              notInDictSamples.push({
                file: path.relative('frontend/src', file).replace(/\\/g, '/'),
                line: index + 1,
                text: raw
              });
            }
          }
        }
      }
    }
  });
}

console.log('Arabic strings found in code that ARE already in ui-dictionary:', inDictCount);
console.log('Arabic strings found in code that ARE NOT in ui-dictionary:', notInDictCount);
console.log('Unique missing strings:', notInDictSet.size);

const outPath = path.resolve(__dirname, 'output/missing-strings.json');
fs.writeFileSync(outPath, JSON.stringify(notInDictSamples, null, 2), 'utf8');
console.log('Wrote missing strings report to', outPath);

console.log('Top 20 samples missing from dict:');
notInDictSamples.slice(0, 20).forEach(s => console.log(' ', `${s.file}:${s.line} -> "${s.text}"`));
