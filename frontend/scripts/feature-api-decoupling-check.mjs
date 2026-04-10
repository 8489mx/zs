import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve('src');
const featuresRoot = path.join(srcRoot, 'features');
const forbidden = [
  "@/services/api/catalog",
  "@/hooks/use-catalog-queries"
];

const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const rel = path.relative(srcRoot, full);
      const text = fs.readFileSync(full, 'utf8');
      if (/^hooks\//.test(rel) || /^features\//.test(rel)) {
        for (const bad of forbidden) {
          if (text.includes(bad)) violations.push(`${rel} imports forbidden shared adapter: ${bad}`);
        }
      }
    }
  }
}

walk(featuresRoot);
const sharedHooks = path.join(srcRoot, 'hooks');
if (fs.existsSync(sharedHooks)) walk(sharedHooks);

if (violations.length) {
  console.error('Feature/API decoupling check failed:\n' + violations.map((v) => `- ${v}`).join('\n'));
  process.exit(1);
}

console.log('Feature/API decoupling check passed.');
