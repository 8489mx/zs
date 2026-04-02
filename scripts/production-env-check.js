#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const strict = process.argv.includes('--strict') || process.env.PRODUCTION_ENV_STRICT === 'true';
const envArgIndex = process.argv.findIndex((arg) => arg === '--env-file');
const envFile = envArgIndex >= 0 && process.argv[envArgIndex + 1]
  ? path.resolve(process.cwd(), process.argv[envArgIndex + 1])
  : path.resolve(root, process.env.PRODUCTION_ENV_FILE || '.env.production');
const outputJsonPath = path.join(root, 'production-env-check-report.json');
const outputMdPath = path.join(docsDir, 'production-env-check.md');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function getValue(env, key, fallback = '') {
  if (Object.prototype.hasOwnProperty.call(process.env, key)) return String(process.env[key] || '');
  if (Object.prototype.hasOwnProperty.call(env, key)) return String(env[key] || '');
  return fallback;
}

function asBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function addIssue(issues, severity, code, message) {
  issues.push({ severity, code, message });
}

function looksPlaceholder(value) {
  return !value
    || /replace-with/i.test(value)
    || /change-me/i.test(value)
    || /example/i.test(value)
    || /placeholder/i.test(value);
}

const env = parseEnvFile(envFile);
const issues = [];
const nodeEnv = getValue(env, 'NODE_ENV', '');
const sessionSecret = getValue(env, 'SESSION_SECRET', '');
const allowedOrigins = getValue(env, 'ALLOWED_ORIGINS', '').split(',').map((v) => v.trim()).filter(Boolean);
const cookieSecure = asBool(getValue(env, 'COOKIE_SECURE', ''), false);
const sameOrigin = asBool(getValue(env, 'ENFORCE_SAME_ORIGIN_WRITES', ''), false);
const allowResetUsers = asBool(getValue(env, 'ALLOW_RESET_USERS', ''), false);
const allowRestoreUsers = asBool(getValue(env, 'ALLOW_RESTORE_USERS', ''), false);
const allowLegacyStateWrite = asBool(getValue(env, 'ALLOW_LEGACY_STATE_WRITE', ''), false);
const defaultAdminPassword = getValue(env, 'DEFAULT_ADMIN_PASSWORD', '');
const minAdminPasswordLength = Number(getValue(env, 'MIN_ADMIN_PASSWORD_LENGTH', '10') || 10);

if (!fs.existsSync(envFile)) {
  addIssue(issues, strict ? 'error' : 'warning', 'env_file_missing', `${path.relative(root, envFile)} is missing.`);
}
if (nodeEnv !== 'production') {
  addIssue(issues, 'error', 'node_env', 'NODE_ENV must be production.');
}
if (looksPlaceholder(sessionSecret)) {
  addIssue(issues, 'error', 'session_secret_placeholder', 'SESSION_SECRET is missing or still placeholder text.');
} else if (sessionSecret.length < 32) {
  addIssue(issues, 'error', 'session_secret_short', 'SESSION_SECRET must be at least 32 characters.');
}
if (!allowedOrigins.length) {
  addIssue(issues, strict ? 'error' : 'warning', 'allowed_origins_empty', 'ALLOWED_ORIGINS should list at least one explicit HTTPS origin.');
}
if (allowedOrigins.some((origin) => !/^https:\/\//i.test(origin))) {
  addIssue(issues, 'error', 'allowed_origins_non_https', 'All ALLOWED_ORIGINS entries must use HTTPS.');
}
if (allowedOrigins.some((origin) => /localhost|127\.0\.0\.1/i.test(origin))) {
  addIssue(issues, strict ? 'error' : 'warning', 'allowed_origins_localhost', 'ALLOWED_ORIGINS still contains localhost entries.');
}
if (!cookieSecure) addIssue(issues, 'error', 'cookie_secure', 'COOKIE_SECURE must be true.');
if (!sameOrigin) addIssue(issues, 'error', 'same_origin', 'ENFORCE_SAME_ORIGIN_WRITES must be true.');
if (allowResetUsers) addIssue(issues, 'error', 'allow_reset_users', 'ALLOW_RESET_USERS must be false in production.');
if (allowLegacyStateWrite) addIssue(issues, 'error', 'allow_legacy_state_write', 'ALLOW_LEGACY_STATE_WRITE must be false in production.');
if (allowRestoreUsers) addIssue(issues, strict ? 'error' : 'warning', 'allow_restore_users', 'ALLOW_RESTORE_USERS should remain false outside a controlled recovery window.');
if (defaultAdminPassword && defaultAdminPassword.length < minAdminPasswordLength) {
  addIssue(issues, 'error', 'default_admin_password_short', `DEFAULT_ADMIN_PASSWORD must be at least ${minAdminPasswordLength} characters when provided.`);
}
if (defaultAdminPassword && /admin|password|1234|changeme/i.test(defaultAdminPassword)) {
  addIssue(issues, 'warning', 'default_admin_password_weak_pattern', 'DEFAULT_ADMIN_PASSWORD looks weak or predictable.');
}
if (!defaultAdminPassword) {
  addIssue(issues, 'warning', 'default_admin_password_blank', 'DEFAULT_ADMIN_PASSWORD is blank. This is acceptable only if your first-boot/admin seeding flow is controlled and documented.');
}

const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
const report = {
  generatedAt: new Date().toISOString(),
  strict,
  envFile: path.relative(root, envFile),
  ok: errorCount === 0,
  counts: { error: errorCount, warning: warningCount },
  snapshot: {
    nodeEnv,
    allowedOrigins,
    cookieSecure,
    sameOrigin,
    allowResetUsers,
    allowRestoreUsers,
    allowLegacyStateWrite,
    hasDefaultAdminPassword: Boolean(defaultAdminPassword),
    sessionSecretLength: sessionSecret.length,
  },
  issues,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
const md = [
  '# Production environment check',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Strict mode: ${strict ? 'yes' : 'no'}`,
  `- Environment file: ${report.envFile}`,
  `- Passed: ${report.ok ? 'yes' : 'no'}`,
  `- Errors: ${errorCount}`,
  `- Warnings: ${warningCount}`,
  '',
  '## Snapshot',
  `- NODE_ENV: ${nodeEnv || '(blank)'}`,
  `- Allowed origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(none)'}`,
  `- COOKIE_SECURE: ${cookieSecure}`,
  `- ENFORCE_SAME_ORIGIN_WRITES: ${sameOrigin}`,
  `- ALLOW_RESET_USERS: ${allowResetUsers}`,
  `- ALLOW_RESTORE_USERS: ${allowRestoreUsers}`,
  `- ALLOW_LEGACY_STATE_WRITE: ${allowLegacyStateWrite}`,
  `- DEFAULT_ADMIN_PASSWORD present: ${Boolean(defaultAdminPassword)}`,
  `- SESSION_SECRET length: ${sessionSecret.length}`,
  '',
  '## Issues',
  ...(issues.length ? issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`) : ['- none']),
  '',
].join('\n');
fs.writeFileSync(outputMdPath, md);
console.log(`[production-env-check] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[production-env-check] wrote ${path.relative(root, outputMdPath)}`);
if (strict && !report.ok) {
  console.error('[production-env-check] strict mode failed. Resolve production environment issues before go-live.');
  process.exit(1);
}
