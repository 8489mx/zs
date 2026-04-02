import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const featuresDir = path.join(srcRoot, 'features');
const failures = [];
const allowedAppImports = new Set(['@/app/store', '@/app/query-keys', '@/app/query-invalidation']);

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function getLayer(filePath) {
  const rel = path.relative(srcRoot, filePath).replaceAll('\\', '/');
  if (rel.startsWith('features/')) {
    const [, , layer = ''] = rel.split('/');
    return layer;
  }
  return rel.split('/')[0];
}

function resolveRelativeImport(filePath, request) {
  if (!request.startsWith('.')) return null;
  const base = path.resolve(path.dirname(filePath), request);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((candidate) => fs.existsSync(candidate)) || base;
}

for (const filePath of walkFiles(featuresDir)) {
  const source = fs.readFileSync(filePath, 'utf8');
  const layer = getLayer(filePath);
  const rel = path.relative(srcRoot, filePath).replaceAll('\\', '/');

  if (layer === 'components') {
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const request = match[1];
      if (allowedAppImports.has(request) || request.startsWith('@/features/')) continue;
      if (request.startsWith('@/app/')) {
        failures.push(`${rel} imports app layer directly (${request})`);
      }
      const resolved = resolveRelativeImport(filePath, request);
      if (resolved && getLayer(resolved) === 'pages') {
        failures.push(`${rel} imports a page module (${request})`);
      }
    }
  }

  if (layer === 'pages') {
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const request = match[1];
      const resolved = resolveRelativeImport(filePath, request);
      if (resolved && getLayer(resolved) === 'pages') {
        failures.push(`${rel} imports another page module (${request})`);
      }
    }
  }
}

if (failures.length) {
  console.error('\nFrontend import layer check failed.\n');
  failures.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log(`\nFrontend import layer check passed.`);
