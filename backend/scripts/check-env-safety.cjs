#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const envExamplePath = path.join(backendRoot, '.env.example');
const runtimeEnvPath = path.join(backendRoot, '.env');

function parseEnv(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fs.existsSync(envExamplePath), 'Missing backend/.env.example');
const envExample = parseEnv(fs.readFileSync(envExamplePath, 'utf8'));

const required = [
  'NODE_ENV',
  'APP_HOST',
  'APP_PORT',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'CORS_ORIGINS',
  'SESSION_COOKIE_SECURE',
  'SESSION_COOKIE_SAME_SITE',
  'SESSION_CSRF_SECRET',
  'ALLOW_SESSION_ID_HEADER',
  'ENABLE_BOOTSTRAP_ADMIN',
  'ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION',
  'DEFAULT_ADMIN_USERNAME',
  'DEFAULT_ADMIN_PASSWORD',
  'LOGIN_RATE_LIMIT_MAX',
  'LOGIN_RATE_LIMIT_WINDOW_SECONDS',
  'AUTH_BURST_RATE_LIMIT_MAX',
  'AUTH_BURST_RATE_LIMIT_WINDOW_SECONDS',
];

for (const key of required) {
  assert(Object.prototype.hasOwnProperty.call(envExample, key), `Missing env.example key: ${key}`);
}

assert(envExample.ALLOW_SESSION_ID_HEADER === 'false', 'ALLOW_SESSION_ID_HEADER must default to false');
assert(envExample.ENABLE_BOOTSTRAP_ADMIN === 'false', 'ENABLE_BOOTSTRAP_ADMIN must default to false');
assert(envExample.ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION === 'false', 'ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION must default to false');
assert(envExample.DEFAULT_ADMIN_PASSWORD === '', 'DEFAULT_ADMIN_PASSWORD must be blank in .env.example');
assert(envExample.SESSION_CSRF_SECRET && envExample.SESSION_CSRF_SECRET.length >= 16, 'SESSION_CSRF_SECRET example must be present and long enough');

if (fs.existsSync(runtimeEnvPath)) {
  const runtime = parseEnv(fs.readFileSync(runtimeEnvPath, 'utf8'));
  const nodeEnv = runtime.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    assert(runtime.SESSION_COOKIE_SECURE === 'true', 'In production, SESSION_COOKIE_SECURE must be true');
    assert((runtime.SESSION_COOKIE_SAME_SITE || '').toLowerCase() !== 'none' || runtime.SESSION_COOKIE_SECURE === 'true', 'SESSION_COOKIE_SAME_SITE=none requires secure cookies');
    assert((runtime.ALLOW_SESSION_ID_HEADER || 'false') === 'false', 'In production, ALLOW_SESSION_ID_HEADER must stay false');
    assert((runtime.ENABLE_BOOTSTRAP_ADMIN || 'false') === 'false', 'In production, ENABLE_BOOTSTRAP_ADMIN must stay false');
    assert((runtime.ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION || 'false') === 'false', 'In production, ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION must stay false');
    assert(Boolean(runtime.SESSION_CSRF_SECRET) && runtime.SESSION_CSRF_SECRET.length >= 24, 'In production, SESSION_CSRF_SECRET must be set to a strong value (24+ chars)');
    assert(runtime.DEFAULT_ADMIN_PASSWORD !== 'ChangeMe123!', 'Default admin password placeholder must never be used');
  }
}

console.log('[check:env-safety] env defaults and runtime hardening checks passed.');
