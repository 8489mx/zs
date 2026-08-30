#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const backendDir = path.resolve(__dirname, 'backend');
const mainPath = path.resolve(backendDir, 'dist', 'main.js');

if (!fs.existsSync(mainPath)) {
  console.error(`[hostinger-api-entry ERROR] Backend build output not found at ${mainPath}`);
  console.error('Please ensure `npm run build` was executed successfully.');
  process.exit(1);
}

// Change working directory to backend so all relative paths/modules/uploads align
process.chdir(backendDir);

// Ensure backend/node_modules is in require lookup paths
require('module').globalPaths.push(path.join(backendDir, 'node_modules'));

console.log(`[hostinger-api-entry] Bootstrapping NestJS backend from ${mainPath}...`);
require(mainPath);
