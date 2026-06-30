#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(repoRoot, 'backend');
const electronBackendRoot = path.join(repoRoot, 'frontend', 'electron', 'backend');

// Clean up old PGLite bundled backend files if they exist
const filesToRemove = [
  'index.js',
  'index1.js',
  'initdb.wasm',
  'pglite.wasm',
  'worker.js',
  'test-db.js',
  'test-db2.js',
  'test-pglite.js'
];

filesToRemove.forEach(file => {
  const filePath = path.join(electronBackendRoot, file);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
    console.log(`Removed legacy PGLite file: ${file}`);
  }
});

// Copy compiled NestJS backend and node_modules
const copies = [
  { source: path.join(backendRoot, 'dist'), target: path.join(electronBackendRoot, 'dist') },
  { source: path.join(backendRoot, 'node_modules'), target: path.join(electronBackendRoot, 'node_modules') },
];

for (const { source, target } of copies) {
  if (!fs.existsSync(source)) {
    console.warn(`Missing source path: ${source}, please make sure you built the backend.`);
    continue;
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, force: true });
  console.log(`Copied ${source} -> ${target}`);
}
