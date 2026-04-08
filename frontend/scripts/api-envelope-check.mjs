import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(process.cwd());
const repoRoot = path.resolve(frontendRoot, '..');
const featuresDir = path.join(frontendRoot, 'src', 'features');
const backendDir = path.join(repoRoot, 'backend', 'src');

function walk(dir, matcher) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, matcher));
    else if (matcher(full)) files.push(full);
  }
  return files;
}

const contractFiles = walk(featuresDir, (file) => file.endsWith('contracts.ts'));
const backendFiles = walk(backendDir, (file) => file.endsWith('.ts'));
const backendSource = backendFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const errors = [];

const pattern = /\{\s*feature:\s*'([^']+)',\s*name:\s*'([^']+)',\s*method:\s*'(GET|POST|PUT|DELETE)',\s*path:\s*'([^']+)'(?:,\s*responseKey:\s*'([^']+)')?\s*\}/g;
for (const file of contractFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(pattern)) {
    const [, feature, name, , routePath, responseKey = ''] = match;
    if (!responseKey) continue;
    const escapedKey = responseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keyPattern = new RegExp(`${escapedKey}\s*:|['"]${escapedKey}['"]`, 'm');
    if (!keyPattern.test(backendSource)) {
      errors.push(`${feature}.${name} expects response key "${responseKey}" for ${routePath}`);
    }
  }
}

if (errors.length) {
  console.error('\nAPI envelope alignment failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('\nAPI envelope alignment passed.');
