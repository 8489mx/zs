#!/usr/bin/env node
const path = require('path');
const { loadEnvFile } = require('./lib/load-env-file');

function parseArgs(argv) {
  const envFileIndex = argv.findIndex((arg) => arg === '--env-file' || arg === '--production-env-file');
  return {
    envFile: envFileIndex >= 0 && argv[envFileIndex + 1] ? argv[envFileIndex + 1] : undefined,
  };
}

const args = parseArgs(process.argv.slice(2));
const requestedEnv = String(process.env.LAUNCH_GATE_ENV || process.env.NODE_ENV || 'production').trim().toLowerCase();
if (requestedEnv) {
  process.env.NODE_ENV = requestedEnv;
}
if (requestedEnv === 'production') {
  loadEnvFile(path.join(__dirname, '..'), args.envFile);
}

const { analyzeLaunchGate } = require('../src/launch-gate');
const config = require('../src/config');

const result = analyzeLaunchGate({
  config,
  projectRoot: path.join(__dirname, '..'),
});

console.log('Launch gate summary');
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
