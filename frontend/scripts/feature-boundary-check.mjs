import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceWithBaseline } from './architecture-baseline.mjs';

const projectRoot = path.resolve(process.cwd());
const featuresDir = path.join(projectRoot, 'src', 'features');

function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walkFiles(featuresDir);
const crossFeatureImports = [];

for (const filePath of files) {
  const relativePath = path.relative(featuresDir, filePath).replaceAll('\\', '/');
  const currentFeature = relativePath.split('/')[0];
  const source = fs.readFileSync(filePath, 'utf8');

  const importMatches = Array.from(source.matchAll(/from\s+['"]@\/features\/([^/'"]+)\/([^'"]+)['"]/g));
  for (const match of importMatches) {
    const importedFeature = match[1];
    const importedPath = match[2];

    if (importedFeature !== currentFeature) {
      crossFeatureImports.push(`${relativePath} imports @/features/${importedFeature}/${importedPath}`);
    }
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

enforceWithBaseline({
  name: 'Feature boundary check',
  baselineFile: path.join(scriptDir, 'baselines', 'feature-boundary.json'),
  violations: crossFeatureImports,
  hint: "Cross-feature imports are not allowed inside feature implementation files. Import through the feature's public index.ts, or move the shared code into src/shared.",
});
