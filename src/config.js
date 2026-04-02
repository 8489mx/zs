const fs = require('fs');
const path = require('path');

function parseEnvLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const idx = trimmed.indexOf('=');
  if (idx === -1) return null;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadEnvFile(filePath, { override = false } = {}) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const entry = parseEnvLine(line);
    if (!entry) return;
    if (override || typeof process.env[entry.key] === 'undefined' || process.env[entry.key] === '') {
      process.env[entry.key] = entry.value;
    }
  });
}

const projectRoot = path.join(__dirname, '..');
const baseEnvPath = path.join(projectRoot, '.env');
loadEnvFile(baseEnvPath, { override: false });

const requestedNodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
const specificEnvPath = path.join(projectRoot, `.env.${requestedNodeEnv}`);
if (requestedNodeEnv && requestedNodeEnv !== 'development') {
  loadEnvFile(specificEnvPath, { override: false });
}

const nodeEnv = String(process.env.NODE_ENV || requestedNodeEnv || 'development').toLowerCase();
const isProduction = nodeEnv === 'production';

function parseTrustProxy(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() == 'false') return false;
  if (raw.toLowerCase() == 'true') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

module.exports = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME || 'ZS',
  defaultAdminPassword: String(process.env.DEFAULT_ADMIN_PASSWORD || '').trim(),
  defaultStoreName: process.env.STORE_NAME || 'Z Systems',
  cookieSecure: String(process.env.COOKIE_SECURE || (String(process.env.NODE_ENV || '').toLowerCase() === 'production' ? 'true' : 'false')).toLowerCase() === 'true',
  allowResetUsers: String(process.env.ALLOW_RESET_USERS || 'false').toLowerCase() === 'true',
  allowRestoreUsers: String(process.env.ALLOW_RESTORE_USERS || 'false').toLowerCase() === 'true',
  allowLegacyStateWrite: String(process.env.ALLOW_LEGACY_STATE_WRITE || 'false').toLowerCase() === 'true',
  useLegacyFrontendFallback: String(process.env.USE_LEGACY_FRONTEND_FALLBACK || 'false').toLowerCase() === 'true',
  requestLogging: String(process.env.REQUEST_LOGGING || 'true').toLowerCase() === 'true',
  maxFailedLoginAttempts: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  sessionDays: Number(process.env.SESSION_DAYS || 7),
  enforceSameOriginWrites: String(process.env.ENFORCE_SAME_ORIGIN_WRITES || (isProduction ? 'true' : 'false')).toLowerCase() === 'true',
  allowedOrigins: String(process.env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean),
  minAdminPasswordLength: Number(process.env.MIN_ADMIN_PASSWORD_LENGTH || 9),
  supportSnapshotLimit: Number(process.env.SUPPORT_SNAPSHOT_LIMIT || 20),
  logLevel: String(process.env.LOG_LEVEL || 'info').toLowerCase(),
  logFormat: String(process.env.LOG_FORMAT || 'plain').toLowerCase() === 'json' ? 'json' : 'plain',
  healthExposeDetails: String(process.env.HEALTH_EXPOSE_DETAILS || 'false').toLowerCase() === 'true',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY || ''),
  singleStoreMode: String(process.env.SINGLE_STORE_MODE || (nodeEnv === 'test' ? 'false' : 'true')).toLowerCase() === 'true'
};
