import fs from 'node:fs';
import path from 'node:path';

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

if (crossFeatureImports.length > 0) {
  console.error('\nFeature boundary check failed. Cross-feature imports are not allowed inside feature implementation files:\n');
  crossFeatureImports.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log(`\nFeature boundary check passed for ${files.length} files.`);
