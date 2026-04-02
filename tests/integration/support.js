const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { wait, requestJson, waitForHealth, extractCookie } = require('../http-test-helpers');

function findByName(items, name) {
  return (items || []).find((item) => String(item.name || '') === name);
}

function findById(items, id) {
  return (items || []).find((item) => String(item.id) === String(id));
}

function sumAmounts(items) {
  return Number((items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2));
}

async function api(method, port, pathName, cookie, body) {
  return requestJson({ method, port, pathName, body, headers: cookie ? { Cookie: cookie } : {} });
}

async function createIntegrationContext() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zstore-integration-'));
  const dbFile = path.join(tempRoot, 'integration.db');
  const port = 3511 + Math.floor(Math.random() * 200);
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DB_FILE: dbFile,
    DEFAULT_ADMIN_USERNAME: 'admin',
    DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
    SESSION_SECRET: 'integration-test-secret-not-for-production',
    REQUEST_LOGGING: 'false',
    ALLOW_LEGACY_STATE_WRITE: 'false',
    NODE_ENV: 'test',
    SINGLE_STORE_MODE: 'false',
  };

  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..', '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.on('data', (chunk) => { stderr += String(chunk); });
  await waitForHealth(port);

  return {
    assert,
    port,
    server,
    wait,
    api,
    extractCookie,
    findByName,
    findById,
    sumAmounts,
    getStderr() { return stderr; },
  };
}

async function closeIntegrationContext(ctx) {
  ctx.server.kill('SIGTERM');
  await ctx.wait(500);
  if (!ctx.server.killed) ctx.server.kill('SIGKILL');
  if (ctx.getStderr().trim()) {
    console.log(ctx.getStderr().trim());
  }
}

module.exports = {
  createIntegrationContext,
  closeIntegrationContext,
};
