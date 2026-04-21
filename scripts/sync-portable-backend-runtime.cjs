#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(repoRoot, 'backend');
const portableBackendRoot = path.join(repoRoot, 'portable', 'app', 'backend');

const copies = [
  { source: path.join(backendRoot, 'dist'), target: path.join(portableBackendRoot, 'dist') },
  { source: path.join(backendRoot, 'node_modules'), target: path.join(portableBackendRoot, 'node_modules') },
];

for (const { source, target } of copies) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing source path: ${source}`);
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, force: true });
  console.log(`Copied ${source} -> ${target}`);
}
