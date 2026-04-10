const fs = require('fs');
const path = require('path');

const candidates = [
  'node_modules/@esbuild/linux-x64/bin/esbuild',
  'node_modules/@rollup/rollup-linux-x64-gnu/rollup.linux-x64-gnu.node',
  'node_modules/vite/bin/vite.js',
  'node_modules/typescript/bin/tsc',
];

for (const relativePath of candidates) {
  const target = path.join(__dirname, '..', relativePath);
  if (!fs.existsSync(target)) continue;
  try {
    fs.chmodSync(target, 0o755);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[repair:permissions] could not update ${relativePath}: ${error.message}`);
    }
  }
}

console.log('[repair:permissions] done');
