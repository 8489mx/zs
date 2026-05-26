#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function log(message, extra) {
  if (extra === undefined) {
    console.log(`[hostinger-api] ${message}`);
    return;
  }
  console.log(`[hostinger-api] ${message}`, extra);
}

function logError(label, error) {
  console.error(`[hostinger-api] ${label}:`, error && error.stack ? error.stack : error);
}

process.on('uncaughtException', (error) => {
  logError('uncaughtException', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError('unhandledRejection', error);
  process.exit(1);
});

log('Starting backend runtime entrypoint...');
log('Runtime info', {
  node: process.version,
  cwd: process.cwd(),
  appHost: process.env.APP_HOST,
  appPort: process.env.APP_PORT,
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  appMode: process.env.APP_MODE,
  deployTarget: process.env.ZS_DEPLOY_TARGET,
});

const backendMain = path.join(process.cwd(), 'backend', 'dist', 'main.js');
log(`Checking backend main at ${backendMain}`);

if (!fs.existsSync(backendMain)) {
  log('backend/dist/main.js was not found. Available root files:');
  console.log(fs.readdirSync(process.cwd()));
  const backendDir = path.join(process.cwd(), 'backend');
  if (fs.existsSync(backendDir)) {
    log('Available backend files:');
    console.log(fs.readdirSync(backendDir));
  }
  process.exit(1);
}

log('Loading backend/dist/main.js...');
require(backendMain);
