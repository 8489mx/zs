const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const RULES = [
  {
    roots: [
      path.join(ROOT, 'src', 'app'),
      path.join(ROOT, 'src', 'catalog-routes'),
      path.join(ROOT, 'src', 'inventory-routes'),
      path.join(ROOT, 'src', 'system-routes'),
      path.join(ROOT, 'src', 'transaction-service'),
      path.join(ROOT, 'src', 'transaction-mutation-service'),
      path.join(ROOT, 'src', 'user-management-service'),
    ],
    maxLines: 360,
    extensions: new Set(['.js']),
  },
  {
    roots: [
      path.join(ROOT, 'frontend', 'src', 'features'),
      path.join(ROOT, 'frontend', 'src', 'components'),
      path.join(ROOT, 'frontend', 'src', 'app'),
    ],
    maxLines: 360,
    extensions: new Set(['.ts', '.tsx']),
  },
];
const IGNORE_SEGMENTS = new Set(['node_modules', 'dist', '.git']);
const failures = [];

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_SEGMENTS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, visit);
    else visit(fullPath);
  }
}

function countLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

for (const rule of RULES) {
  for (const root of rule.roots) {
    walk(root, (filePath) => {
      if (!rule.extensions.has(path.extname(filePath))) return;
      const lines = countLines(filePath);
      if (lines > rule.maxLines) failures.push({ filePath: path.relative(ROOT, filePath), lines, max: rule.maxLines });
    });
  }
}

if (failures.length) {
  console.error('Architecture file size check failed:');
  failures.sort((a, b) => b.lines - a.lines).forEach((item) => console.error(`- ${item.filePath}: ${item.lines} lines (max ${item.max})`));
  process.exit(1);
}

console.log('Architecture file size check passed.');
