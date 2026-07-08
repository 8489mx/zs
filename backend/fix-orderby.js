const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
let changedCount = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  content = content.replace(/\.orderBy\(['"`]([a-zA-Z0-9_\.]+) (asc|desc)['"`]\)/g, '.orderBy(\'$1\', \'$2\')');
  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    changedCount++;
  }
});
console.log('Modified files:', changedCount);
