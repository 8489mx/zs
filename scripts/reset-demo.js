#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'seed-demo.js'), '--fresh', '--force'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status || 0);
