import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const featuresDir = path.join(projectRoot, 'src', 'features');

function readDirNames(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function parseRoutesFile(featureName) {
  const filePath = path.join(featuresDir, featureName, 'routes.tsx');
  if (!fs.existsSync(filePath)) {
    return { featureName, filePath, missing: true, routes: [], navigation: [] };
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const routePaths = Array.from(source.matchAll(/path:\s*'([^']+)'/g), (match) => match[1]);
  const hasIndexRoute = /index:\s*true/.test(source);
  const navigation = Array.from(
    source.matchAll(/navigation:\s*\[\{\s*key:\s*'([^']+)',\s*label:\s*'([^']+)',\s*to:\s*'([^']+)'(?:,\s*end:\s*(true|false))?/g),
    (match) => ({ key: match[1], label: match[2], to: match[3], end: match[4] === 'true' })
  );

  const routes = [];
  if (hasIndexRoute) {
    routes.push({ type: 'index', path: '/' });
  }
  routePaths.forEach((routePath) => routes.push({ type: 'path', path: `/${routePath}` }));

  return { featureName, filePath, missing: false, routes, navigation };
}

const featureNames = readDirNames(featuresDir).filter((feature) => !['auth', 'not-found', 'activation'].includes(feature));
const parsedModules = featureNames.map(parseRoutesFile);
const errors = [];

const seenRoutePaths = new Map();
const seenNavKeys = new Map();
const seenNavTargets = new Map();

for (const moduleDef of parsedModules) {
  if (moduleDef.missing) {
    errors.push(`Feature "${moduleDef.featureName}" is missing routes.tsx`);
    continue;
  }

  if (moduleDef.routes.length === 0) {
    errors.push(`Feature "${moduleDef.featureName}" does not declare any routes.`);
  }

  if (moduleDef.navigation.length === 0) {
    errors.push(`Feature "${moduleDef.featureName}" does not declare any navigation items.`);
  }

  for (const route of moduleDef.routes) {
    if (seenRoutePaths.has(route.path)) {
      errors.push(`Duplicate route path "${route.path}" found in features "${seenRoutePaths.get(route.path)}" and "${moduleDef.featureName}".`);
    } else {
      seenRoutePaths.set(route.path, moduleDef.featureName);
    }
  }

  for (const nav of moduleDef.navigation) {
    if (seenNavKeys.has(nav.key)) {
      errors.push(`Duplicate navigation key "${nav.key}" found in features "${seenNavKeys.get(nav.key)}" and "${moduleDef.featureName}".`);
    } else {
      seenNavKeys.set(nav.key, moduleDef.featureName);
    }

    if (seenNavTargets.has(nav.to)) {
      errors.push(`Duplicate navigation target "${nav.to}" found in features "${seenNavTargets.get(nav.to)}" and "${moduleDef.featureName}".`);
    } else {
      seenNavTargets.set(nav.to, moduleDef.featureName);
    }

    const routePaths = new Set(moduleDef.routes.map((route) => route.path));
    if (!routePaths.has(nav.to)) {
      errors.push(`Navigation target "${nav.to}" in feature "${moduleDef.featureName}" does not match one of its route paths (${Array.from(routePaths).join(', ') || 'none'}).`);
    }
  }
}

if (errors.length > 0) {
  console.error('\nRoute QA failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('\nRoute QA passed.');
for (const moduleDef of parsedModules) {
  console.log(`- ${moduleDef.featureName}: routes=${moduleDef.routes.map((route) => route.path).join(', ')} nav=${moduleDef.navigation.map((nav) => nav.to).join(', ')}`);
}
