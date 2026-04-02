import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(process.cwd());
const repoRoot = path.resolve(frontendRoot, '..');
const featuresDir = path.join(frontendRoot, 'src', 'features');
const backendDir = path.join(repoRoot, 'src');

function walk(dir, matcher) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, matcher));
    else if (matcher(full)) files.push(full);
  }
  return files;
}

function readContracts() {
  const files = walk(featuresDir, (file) => file.endsWith('contracts.ts'));
  const contracts = [];
  const pattern = /\{\s*feature:\s*'([^']+)',\s*name:\s*'([^']+)',\s*method:\s*'(GET|POST|PUT|DELETE)',\s*path:\s*'([^']+)'(?:,\s*responseKey:\s*'([^']+)')?\s*\}/g;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      contracts.push({ file: path.relative(frontendRoot, file), feature: match[1], name: match[2], method: match[3], path: match[4], responseKey: match[5] || '' });
    }
  }
  return contracts;
}

function readBackendRoutes() {
  const files = walk(backendDir, (file) => file.endsWith('.js'));
  const routes = [];
  const pattern = /app\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]/g;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      routes.push({ file: path.relative(repoRoot, file), method: match[1].toUpperCase(), path: match[2] });
    }
  }
  return routes;
}

const contracts = readContracts();
const routes = readBackendRoutes();
const missing = [];

for (const contract of contracts) {
  const found = routes.find((route) => route.method === contract.method && route.path === contract.path);
  if (!found) missing.push(contract);
}

if (missing.length) {
  console.error('\nAPI contract alignment failed. Missing backend routes:\n');
  missing.forEach((entry) => console.error(`- [${entry.method}] ${entry.path} (${entry.feature}.${entry.name}) from ${entry.file}`));
  process.exit(1);
}

console.log(`\nAPI contract alignment passed for ${contracts.length} contracts.`);
