const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const config = require('../config');
const bootstrap = require('../bootstrap');
const logger = require('../logger');
const { createRateLimiter } = require('../security');
const { normalizeOrigin } = require('../validation');
const { isSuperAdminRole } = require('../auth');
const { assertRuntimeConfig } = require('../runtime-config-guard');

function validateStartupConfig() {
  const result = assertRuntimeConfig(config, { envName: config.nodeEnv, forceProduction: config.isProduction });
  result.findings
    .filter((item) => item.severity === 'warning')
    .forEach((item) => logger.warn('runtime_config_warning', { code: item.code, message: item.message }));
}

function createRuntimeContext() {
  validateStartupConfig();
  bootstrap();

  const app = express();
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser());

  const sessionCookieOptions = {
    httpOnly: true,
    sameSite: config.cookieSecure ? 'strict' : 'lax',
    secure: config.cookieSecure,
    path: '/',
  };

  function getRequestOrigin(req) {
    return normalizeOrigin(req.headers.origin || '');
  }

  function isAllowedOrigin(req) {
    const origin = getRequestOrigin(req);
    if (!origin) return true;
    const allowed = new Set(config.allowedOrigins.map(normalizeOrigin));
    const host = String(req.headers.host || '').trim();
    const proto = String((config.trustProxy ? (req.headers['x-forwarded-proto'] || '') : '') || (config.cookieSecure ? 'https' : 'http')).split(',')[0].trim();
    if (host) allowed.add(normalizeOrigin(`${proto}://${host}`));
    return allowed.has(origin);
  }

  function enforceSameOriginWrites(req, res, next) {
    const method = String(req.method || 'GET').toUpperCase();
    if (!config.enforceSameOriginWrites || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();
    if (req.path.startsWith('/api/health')) return next();
    if (!isAllowedOrigin(req)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    next();
  }

  function setNoStore(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
  }

  app.use((req, res, next) => {
    req.requestId = crypto.randomBytes(8).toString('hex');
    res.setHeader('X-Request-Id', req.requestId);
    const startedAt = Date.now();
    res.on('finish', () => {
      if (!config.requestLogging || req.path === '/api/health') return;
      const actor = req.user ? `${req.user.username}#${req.user.id}` : 'guest';
      logger.info('http_request', {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        actor,
      });
    });
    next();
  });

  app.use(enforceSameOriginWrites);
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.isProduction && config.cookieSecure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Content-Security-Policy', `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${res.locals.cspNonce}' 'strict-dynamic'; script-src-attr 'none'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'`);
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  const reactDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(reactDistPath)) {
    app.use(express.static(reactDistPath, { index: false }));
  }

  const rateLimiters = {
    loginRateLimit: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
    restoreRateLimit: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 }),
    backupVerifyRateLimit: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 15 }),
    backupDownloadRateLimit: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 }),
    inventoryAdjustmentRateLimit: createRateLimiter({ windowMs: 5 * 60 * 1000, max: 30 }),
  };

  function requirePermission(permission) {
    return (req, res, next) => {
      if (isSuperAdminRole(req.user?.role)) return next();
      if (req.user?.permissions?.includes(permission)) return next();
      return res.status(403).json({ error: 'Permission denied' });
    };
  }

  function requireAnyPermission(permissions) {
    const required = Array.isArray(permissions) ? permissions.filter(Boolean) : [permissions].filter(Boolean);
    return (req, res, next) => {
      if (isSuperAdminRole(req.user?.role)) return next();
      const userPerms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
      if (required.some((perm) => userPerms.includes(perm))) return next();
      return res.status(403).json({ error: 'Permission denied' });
    };
  }

  function userHasPermission(user, permission) {
    if (!user) return false;
    if (isSuperAdminRole(user.role)) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  }

  return {
    app,
    config,
    logger,
    sessionCookieOptions,
    setNoStore,
    requirePermission,
    requireAnyPermission,
    userHasPermission,
    rateLimiters,
  };
}

module.exports = {
  createRuntimeContext,
};
