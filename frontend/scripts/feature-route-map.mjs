import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const featuresDir = path.join(root, 'src', 'features');
const features = fs.readdirSync(featuresDir).filter((name) => fs.statSync(path.join(featuresDir, name)).isDirectory());
const rows = [];
for (const feature of features) {
  const routesFile = path.join(featuresDir, feature, 'routes.tsx');
  if (!fs.existsSync(routesFile)) continue;
  const text = fs.readFileSync(routesFile, 'utf8');
  const paths = [...text.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  rows.push({ feature, paths: paths.join(', ') || '(none)' });
}
console.log('Feature route map');
for (const row of rows.sort((a, b) => a.feature.localeCompare(b.feature))) {
  console.log(`- ${row.feature}: ${row.paths}`);
}
