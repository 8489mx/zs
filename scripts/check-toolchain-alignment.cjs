#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const rootPackage = readJson('package.json');
const frontendPackage = readJson('frontend/package.json');
const backendPackage = readJson('backend/package.json');
const nvmrc = read('.nvmrc').trim();
const ci = read('.github/workflows/ci.yml');
const backendDockerfile = read('backend/Dockerfile');

const expectedNodeMajor = '22';
const expectedEngine = '>=22 <23';

for (const [label, pkg] of [['root', rootPackage], ['frontend', frontendPackage], ['backend', backendPackage]]) {
  if (!pkg.engines || pkg.engines.node !== expectedEngine) {
    throw new Error(`${label} package.json must declare engines.node=${expectedEngine}`);
  }
}

if (nvmrc !== expectedNodeMajor) {
  throw new Error(`.nvmrc must be ${expectedNodeMajor}`);
}

if (!ci.includes('node-version: 22')) {
  throw new Error('CI workflow must pin Node 22');
}

if (!backendDockerfile.includes('FROM node:22-alpine AS builder') || !backendDockerfile.includes('FROM node:22-alpine AS runner')) {
  throw new Error('backend Dockerfile must stay aligned with Node 22 in both stages');
}

console.log('Toolchain alignment check passed (Node 22 across .nvmrc, package engines, CI, Dockerfile).');
