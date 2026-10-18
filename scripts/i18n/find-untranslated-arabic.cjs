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
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const arabicRegex = /[\u0600-\u06FF]/;
const files = walk('frontend/src');
const issues = [];

for (const file of files) {
  // Exclude test files
  if (file.includes('.spec.') || file.includes('.test.')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Strip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    
    if (arabicRegex.test(line)) {
      // Check if it's solely inside t('...', "...") or __t('...', "...")
      // Remove all t(..., "arabic") calls from the line
      const cleanLine = line
        .replace(/t\(\s*['"][^'"]+['"]\s*,\s*(['"])(?:(?!\1).|\\.)*\1\s*\)/g, '')
        .replace(/__t\(\s*['"][^'"]+['"]\s*,\s*(['"])(?:(?!\1).|\\.)*\1\s*\)/g, '');

      if (arabicRegex.test(cleanLine)) {
        // Still has Arabic!
        issues.push({
          file: path.relative('frontend/src', file).replace(/\\/g, '/'),
          line: index + 1,
          text: cleanLine.trim()
        });
      }
    }
  });
}

console.log(`Found ${issues.length} lines with raw Arabic outside t(...) / __t(...) across ${files.length} tsx files.`);
const fileCount = {};
issues.forEach(i => {
  fileCount[i.file] = (fileCount[i.file] || 0) + 1;
});

const sorted = Object.entries(fileCount).sort((a, b) => b[1] - a[1]);
console.log('Top files with raw Arabic:');
sorted.slice(0, 20).forEach(([f, count]) => {
  console.log(`  ${count} lines: ${f}`);
});
