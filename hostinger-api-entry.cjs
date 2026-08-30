#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const mainPath = path.resolve(__dirname, 'backend', 'dist', 'main.js');

if (!fs.existsSync(mainPath)) {
  console.error(`[hostinger-api-entry ERROR] Backend build output not found at ${mainPath}`);
  console.error('Please ensure `npm run build` was executed successfully.');
  process.exit(1);
}

console.log(`[hostinger-api-entry] Bootstrapping NestJS backend from ${mainPath}...`);
require(mainPath);
