import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceWithBaseline } from './architecture-baseline.mjs';

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

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

enforceWithBaseline({
  name: 'Feature contract check',
  baselineFile: path.join(scriptDir, 'baselines', 'feature-contract.json'),
  violations: errors,
  hint: "Every feature should expose an index.ts that re-exports its routes and page component.",
});
