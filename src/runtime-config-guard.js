function looksPlaceholder(value) {
  const raw = String(value || '').trim();
  return !raw
    || /change-me/i.test(raw)
    || /replace-with/i.test(raw)
    || /placeholder/i.test(raw)
    || /example/i.test(raw);
}

function push(findings, severity, code, message) {
  findings.push({ severity, code, message });
}

function analyzeRuntimeConfig(config = {}, options = {}) {
  const findings = [];
  const envName = String(options.envName || config.nodeEnv || 'development').toLowerCase();
  const isProduction = options.forceProduction === true || config.isProduction === true || envName === 'production';
  const sessionSecret = String(config.sessionSecret || '').trim();
  const allowedOrigins = Array.isArray(config.allowedOrigins)
    ? config.allowedOrigins.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const minAdminPasswordLength = Math.max(8, Number(config.minAdminPasswordLength || 10));
  const defaultAdminPassword = String(config.defaultAdminPassword || '').trim();

  if (isProduction) {
    if (looksPlaceholder(sessionSecret)) {
      push(findings, 'error', 'session_secret_placeholder', 'SESSION_SECRET is missing or still uses a placeholder value.');
    } else if (sessionSecret.length < 32) {
      push(findings, 'error', 'session_secret_short', 'SESSION_SECRET must be at least 32 characters in production.');
    }

    if (!config.cookieSecure) {
      push(findings, 'error', 'cookie_secure_required', 'COOKIE_SECURE must be true in production.');
    }
    if (!config.enforceSameOriginWrites) {
      push(findings, 'error', 'same_origin_required', 'ENFORCE_SAME_ORIGIN_WRITES must be true in production.');
    }
    if (!allowedOrigins.length) {
      push(findings, 'error', 'allowed_origins_required', 'ALLOWED_ORIGINS must list at least one HTTPS origin in production.');
    }
    if (allowedOrigins.some((origin) => !/^https:\/\//i.test(origin))) {
      push(findings, 'error', 'allowed_origins_https_only', 'ALLOWED_ORIGINS must contain HTTPS origins only in production.');
    }
    if (allowedOrigins.some((origin) => /localhost|127\.0\.0\.1/i.test(origin))) {
      push(findings, 'error', 'allowed_origins_localhost', 'ALLOWED_ORIGINS must not include localhost or loopback values in production.');
    }
    if (config.allowResetUsers) {
      push(findings, 'error', 'allow_reset_users_enabled', 'ALLOW_RESET_USERS must remain false in production.');
    }
    if (config.allowLegacyStateWrite) {
      push(findings, 'error', 'allow_legacy_state_write_enabled', 'ALLOW_LEGACY_STATE_WRITE must remain false in production.');
    }
    if (config.allowRestoreUsers) {
      push(findings, 'warning', 'allow_restore_users_enabled', 'ALLOW_RESTORE_USERS is enabled. Keep it off unless you are executing a controlled restore window.');
    }
  }

  if (defaultAdminPassword) {
    if (defaultAdminPassword.length < minAdminPasswordLength) {
      push(findings, 'error', 'default_admin_password_short', `DEFAULT_ADMIN_PASSWORD must be at least ${minAdminPasswordLength} characters.`);
    }
    if (looksPlaceholder(defaultAdminPassword)) {
      push(findings, 'error', 'default_admin_password_placeholder', 'DEFAULT_ADMIN_PASSWORD still uses a placeholder-style value.');
    }
  } else if (isProduction) {
    push(findings, 'warning', 'default_admin_password_blank', 'DEFAULT_ADMIN_PASSWORD is blank. This is acceptable only with a controlled first-boot rotation flow.');
  }

  if (String(config.logLevel || '').toLowerCase() === 'debug') {
    push(findings, 'warning', 'debug_logging_enabled', 'LOG_LEVEL=debug will create noisy production logs.');
  }
  if (config.healthExposeDetails) {
    push(findings, 'warning', 'health_details_exposed', 'HEALTH_EXPOSE_DETAILS is enabled. Disable it for public production exposure.');
  }

  const summary = {
    errors: findings.filter((item) => item.severity === 'error').length,
    warnings: findings.filter((item) => item.severity === 'warning').length,
  };

  return {
    envName,
    isProduction,
    findings,
    summary,
    ok: summary.errors === 0,
  };
}

function assertRuntimeConfig(config = {}, options = {}) {
  const result = analyzeRuntimeConfig(config, options);
  if (!result.ok) {
    const errorLines = result.findings
      .filter((item) => item.severity === 'error')
      .map((item) => `- ${item.code}: ${item.message}`);
    const err = new Error(`Runtime configuration is not launch-safe:\n${errorLines.join('\n')}`);
    err.findings = result.findings;
    throw err;
  }
  return result;
}

module.exports = {
  analyzeRuntimeConfig,
  assertRuntimeConfig,
};
