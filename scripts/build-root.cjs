#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function checkVersions() {
  try {
    const fs = require('fs');
    const path = require('path');
    const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const fePkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/package.json'), 'utf8'));
    
    if (rootPkg.version !== fePkg.version) {
      console.error(`[ERROR] Version mismatch detected!`);
      console.error(`Root package.json version: ${rootPkg.version}`);
      console.error(`Frontend package.json version: ${fePkg.version}`);
      console.error(`Please synchronize versions before building.`);
      process.exit(1);
    }
  } catch (e) {
    console.warn(`[WARN] Could not check versions: ${e.message}`);
  }
}

checkVersions();

const deployTarget = String(process.env.ZS_DEPLOY_TARGET || '').trim().toLowerCase();

if (deployTarget === 'backend' || deployTarget === 'api' || deployTarget === 'hostinger-api') {
  console.log('[build] ZS_DEPLOY_TARGET=%s: installing and building backend only.', deployTarget);
  const ciRes = spawnSync('npm', ['--prefix', 'backend', 'ci', '--include=dev'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (ciRes.status !== 0) {
    console.warn('[build] npm ci failed, falling back to npm install --include=dev');
    run('npm', ['--prefix', 'backend', 'install', '--include=dev']);
  }
  run('npm', ['--prefix', 'backend', 'run', 'build']);
  process.exit(0);
}

if (deployTarget === 'frontend' || deployTarget === 'web' || deployTarget === 'hostinger-frontend') {
  console.log('[build] ZS_DEPLOY_TARGET=%s: installing and building frontend only.', deployTarget);
  const ciRes = spawnSync('npm', ['--prefix', 'frontend', 'ci', '--include=dev'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (ciRes.status !== 0) {
    console.warn('[build] npm ci failed, falling back to npm install --include=dev');
    run('npm', ['--prefix', 'frontend', 'install', '--include=dev']);
  }
  run('npm', ['--prefix', 'frontend', 'run', 'build']);
  process.exit(0);
}

console.log('[build] Building full workspace with existing default behavior.');
run('npm', ['--prefix', 'backend', 'run', 'build']);
run('npm', ['--prefix', 'frontend', 'run', 'build']);
