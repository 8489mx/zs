import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const featuresDir = path.join(projectRoot, 'src', 'features');

const expectedSlices = {
  dashboard: ['index.ts', 'routes.tsx', 'pages'],
  products: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'schemas', 'utils'],
  sales: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'utils'],
  pos: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'lib', 'types'],
  purchases: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'utils'],
  inventory: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'utils'],
  customers: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'schemas'],
  suppliers: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'schemas'],
  accounts: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'schemas'],
  reports: ['index.ts', 'routes.tsx', 'pages', 'hooks'],
  settings: ['index.ts', 'routes.tsx', 'pages', 'hooks', 'components', 'api', 'schemas'],
  auth: ['index.ts', 'pages'],
  'not-found': ['index.ts', 'pages']
};

const errors = [];

for (const [featureName, slices] of Object.entries(expectedSlices)) {
  const featurePath = path.join(featuresDir, featureName);
  if (!fs.existsSync(featurePath)) {
    errors.push(`Feature folder "${featureName}" is missing.`);
    continue;
  }

  for (const sliceName of slices) {
    const slicePath = path.join(featurePath, sliceName);
    if (!fs.existsSync(slicePath)) {
      errors.push(`Feature "${featureName}" is missing required slice "${sliceName}".`);
      continue;
    }

    const stat = fs.statSync(slicePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(slicePath).filter(Boolean);
      if (entries.length === 0) {
        errors.push(`Feature "${featureName}" slice "${sliceName}" is empty.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('\nFeature structure check failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('\nFeature structure check passed.');
Object.entries(expectedSlices).forEach(([featureName, slices]) => {
  console.log(`- ${featureName}: ${slices.join(', ')}`);
});
