import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src/features');
const features = fs.readdirSync(root).filter((name) => fs.statSync(path.join(root, name)).isDirectory());
const routeOptionalFeatures = new Set(['auth', 'not-found']);

const report = [];
let failures = 0;

for (const feature of features) {
  const featureDir = path.join(root, feature);
  const routesFile = path.join(featureDir, 'routes.tsx');
  const pagesDir = path.join(featureDir, 'pages');
  const pageFiles = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((file) => file.endsWith('Page.tsx')) : [];

  const item = {
    feature,
    hasRoutes: fs.existsSync(routesFile),
    pageFiles,
    routePaths: [],
    hasIndexRoute: false
  };

  if (!item.hasRoutes) {
    if (!routeOptionalFeatures.has(feature)) failures += 1;
    report.push(item);
    continue;
  }

  const routesSource = fs.readFileSync(routesFile, 'utf8');
  item.routePaths = Array.from(routesSource.matchAll(/path:\s*['"]([^'"]+)['"]/g)).map((match) => match[1]);
  item.hasIndexRoute = /index:\s*true/.test(routesSource);

  if (!item.routePaths.length && !item.hasIndexRoute) failures += 1;
  if (!pageFiles.length) failures += 1;
  report.push(item);
}

const outPath = path.resolve(process.cwd(), 'route-live-sweep-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Route live sweep report written to ${outPath}`);

if (failures > 0) {
  console.error(`Route live sweep found ${failures} issue(s).`);
  process.exit(1);
}

console.log('Route live sweep passed.');
