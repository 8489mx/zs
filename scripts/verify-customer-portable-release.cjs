#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const requiredReleaseFiles = [
  'app/backend/dist/main.js',
  'app/backend/package.json',
  'app/frontend/index.html',
  'config/.env.offline.template',
  'runtime/node/node.exe',
  'runtime/node/npm.cmd',
  'runtime/node/node_modules/npm/bin/npm-cli.js',
  'runtime/postgres/bin/postgres.exe',
  'runtime/postgres/bin/pg_ctl.exe',
  'runtime/postgres/bin/initdb.exe',
  'runtime/postgres/bin/psql.exe',
];

const forbiddenReleasePaths = [
  'config/.env.offline',
  'runtime/data',
  'runtime/logs',
  'runtime/run',
  'app/backend/.env',
  'app/backend/dist/.env',
  'app/backend/scripts/reset-zs-password.js',
  'backend/.env',
  'backend/scripts/reset-zs-password.js',
];

function toPortablePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function assertInsideRoot(root, target) {
  const rootFull = path.resolve(root);
  const targetFull = path.resolve(target);
  if (targetFull !== rootFull && !targetFull.startsWith(rootFull + path.sep)) {
    throw new Error(`Path escapes release root: ${target}`);
  }
}

function exists(root, relPath) {
  const fullPath = path.join(root, relPath);
  assertInsideRoot(root, fullPath);
  return fs.existsSync(fullPath);
}

function listBakFiles(root, current = root, matches = []) {
  if (!fs.existsSync(current)) return matches;
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    assertInsideRoot(root, fullPath);
    if (entry.isDirectory()) {
      listBakFiles(root, fullPath, matches);
      continue;
    }
    if (entry.name.toLowerCase().endsWith('.bak')) {
      matches.push(toPortablePath(path.relative(root, fullPath)));
    }
  }
  return matches;
}

function verifyPortableRelease(releaseRoot) {
  const root = path.resolve(releaseRoot || '');
  if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Customer portable release directory not found: ${releaseRoot}`);
  }

  const missing = requiredReleaseFiles.filter((relPath) => !exists(root, relPath));
  if (missing.length) {
    throw new Error(`Customer portable release is missing required files: ${missing.join(', ')}`);
  }

  const forbidden = forbiddenReleasePaths.filter((relPath) => exists(root, relPath));
  forbidden.push(...listBakFiles(root));
  if (forbidden.length) {
    throw new Error(`Customer portable release contains forbidden local/generated files: ${forbidden.join(', ')}`);
  }

  return { ok: true, root };
}

function runCli() {
  const releaseRoot = process.argv[2];
  if (!releaseRoot) {
    console.error('Usage: node scripts/verify-customer-portable-release.cjs <release-directory>');
    process.exit(1);
  }

  try {
    const result = verifyPortableRelease(releaseRoot);
    console.log(`Customer portable release preflight OK: ${result.root}`);
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  forbiddenReleasePaths,
  requiredReleaseFiles,
  verifyPortableRelease,
};
