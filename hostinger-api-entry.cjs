#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const backendDir = path.resolve(__dirname, 'backend');
const backendNodeModules = path.join(backendDir, 'node_modules');
const mainPath = path.resolve(backendDir, 'dist', 'main.js');

if (!fs.existsSync(mainPath)) {
  console.error(`[hostinger-api-entry ERROR] Backend build output not found at ${mainPath}`);
  console.error('Please ensure `npm run build` was executed successfully.');
  process.exit(1);
}

// Change working directory to backend
process.chdir(backendDir);

// Inject backend/node_modules into Node.js resolution paths
process.env.NODE_PATH = [backendNodeModules, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
try {
  require('module').Module._initPaths();
} catch (_) {}

console.log(`[hostinger-api-entry] Bootstrapping NestJS backend from ${mainPath}...`);
require(mainPath);
