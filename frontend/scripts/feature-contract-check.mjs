import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const featuresDir = path.join(root, 'src', 'features');
const featureNames = fs.readdirSync(featuresDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const errors = [];

for (const featureName of featureNames) {
  const featureDir = path.join(featuresDir, featureName);
  const indexFile = path.join(featureDir, 'index.ts');
  if (!fs.existsSync(indexFile)) {
    errors.push(`Feature ${featureName} is missing index.ts`);
    continue;
  }
  const source = fs.readFileSync(indexFile, 'utf8');
  if (featureName !== 'auth' && featureName !== 'not-found') {
    if (!/routes/.test(source)) {
      errors.push(`Feature ${featureName} index.ts does not re-export routes.`);
    }
  }
  if (!/Page/.test(source) && featureName !== 'auth' && featureName !== 'not-found') {
    errors.push(`Feature ${featureName} index.ts does not re-export its page component.`);
  }
}

if (errors.length) {
  console.error('\nFeature contract check failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`\nFeature contract check passed for ${featureNames.length} features.`);
