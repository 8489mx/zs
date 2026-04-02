const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const ROUTE_DIRS = ['catalog-routes', 'inventory-routes', 'system-routes', 'transaction-routes'].map((segment) => path.join(SRC, segment));
const failures = [];

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, result);
    else if (entry.name.endsWith('.js')) result.push(fullPath);
  }
  return result;
}

function normalizeImportTarget(fromFile, request) {
  if (!request.startsWith('.')) return null;
  return path.normalize(path.join(path.dirname(fromFile), request));
}

function checkRouteFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const imports = Array.from(source.matchAll(/require\(['"]([^'"]+)['"]\)/g)).map((match) => match[1]);
  const routeRoot = ROUTE_DIRS.find((dir) => filePath.startsWith(dir));
  for (const request of imports) {
    const target = normalizeImportTarget(filePath, request);
    if (!target) continue;
    if (target.includes(`${path.sep}src${path.sep}db${path.sep}`) || target.endsWith(`${path.sep}src${path.sep}db`)) {
      failures.push(`${path.relative(ROOT, filePath)} imports db layer directly (${request})`);
      continue;
    }
    for (const routeDir of ROUTE_DIRS) {
      if (routeDir === routeRoot) continue;
      if (target.startsWith(routeDir)) {
        failures.push(`${path.relative(ROOT, filePath)} crosses route boundary (${request})`);
      }
    }
  }
}

for (const routeDir of ROUTE_DIRS) {
  for (const filePath of walk(routeDir)) checkRouteFile(filePath);
}

if (failures.length) {
  console.error('Backend import boundary check failed:\n');
  failures.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log('Backend import boundary check passed.');
