#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

for (const file of [
  'installer/windows/build-installer.ps1',
  'installer/windows/zs-offline.iss',
  'windows/lib/Common.ps1',
  'windows/lib/Start-ZS.ps1',
  'windows/lib/Stop-ZS.ps1',
  '.env.offline.example',
]) {
  assert(exists(file), `Missing Windows sale-readiness file: ${file}`);
}

const repoPkg = JSON.parse(read('package.json'));
for (const scriptName of ['installer:windows', 'qa:sale-ready', 'release:bundle']) {
  assert(repoPkg.scripts && repoPkg.scripts[scriptName], `Missing repo package script: ${scriptName}`);
}

const installerBuilder = read('installer/windows/build-installer.ps1');
assert(installerBuilder.includes('package.json'), 'Installer builder must read package.json version');
assert(installerBuilder.includes('/DMyAppVersion='), 'Installer builder must pass version define to Inno Setup');

const commonPs = read('windows/lib/Common.ps1');
assert(commonPs.includes('Assert-OfflineMode'), 'Windows launcher common lib must enforce APP_MODE=offline');
assert(commonPs.includes('Get-OfflineAppUrl'), 'Windows launcher common lib must derive offline app URL from env');

const offlineEnvExample = read('.env.offline.example');
for (const token of [
  'APP_MODE=offline',
  'NODE_ENV=production',
  'SESSION_COOKIE_SECURE=true',
  'SESSION_COOKIE_SAME_SITE=strict',
  'SESSION_CSRF_SECRET=',
  'ALLOW_SESSION_ID_HEADER=false',
]) {
  assert(offlineEnvExample.includes(token), `Missing offline env policy token: ${token}`);
}

console.log('[check:windows-sale-ready] installer wiring and offline launcher policy passed.');
