import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');

const requiredFiles = [
  'app/router/root-router.tsx',
  'app/router/registry.ts',
  'shared/layout/app-shell.tsx',
  'shared/system/app-error-boundary.tsx',
  'shared/components/query-feedback.tsx',
  'shared/components/mutation-feedback.tsx',
  'shared/components/submit-button.tsx',
  'lib/errors.ts'
];

const routes = [
  'dashboard', 'products', 'sales', 'pos', 'cash-drawer', 'purchases', 'inventory',
  'customers', 'suppliers', 'accounts', 'returns', 'reports', 'audit', 'treasury',
  'services', 'settings'
];

const failures = [];
for (const file of requiredFiles) {
  const full = path.join(src, file);
  if (!fs.existsSync(full)) failures.push(`Missing required file: ${file}`);
}

for (const feature of routes) {
  const featureRoot = path.join(src, 'features', feature);
  const mustExist = ['index.ts', 'routes.tsx', 'pages'];
  for (const part of mustExist) {
    const full = path.join(featureRoot, part);
    if (!fs.existsSync(full)) failures.push(`Feature ${feature} is missing ${part}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts?.build) failures.push('frontend/package.json is missing build script');
if (!packageJson.scripts?.qa) failures.push('frontend/package.json is missing qa script');
if (!packageJson.scripts?.['qa:functional']) failures.push('frontend/package.json is missing qa:functional script');

if (failures.length) {
  console.error('Functional smoke check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Functional smoke check passed.');
