const { fileExists, readFile } = require('./file-system');

function collectFileChecks({ findings, projectRoot }) {
  const push = (severity, code, message) => findings.push({ severity, code, message });
  const requireFile = (relPath, code, severity = 'error') => {
    if (!fileExists(projectRoot, relPath)) push(severity, code, `${relPath} is missing`);
  };

  requireFile('src/server.js', 'missing_server');
  requireFile('src/transaction-service.js', 'missing_transaction_service');
  requireFile('src/transaction-mutation-service.js', 'missing_transaction_mutation_service');
  requireFile('src/report-routes.js', 'missing_report_routes');
  requireFile('src/admin-routes.js', 'missing_admin_routes');
  requireFile('src/system-routes.js', 'missing_system_routes');
  requireFile('src/backup-service.js', 'missing_backup_service');
  requireFile('frontend/index.html', 'missing_frontend_index');
  requireFile('frontend/package.json', 'missing_frontend_package_json');
  requireFile('src/accounting-invariants.js', 'missing_accounting_invariants');
  requireFile('tests/run-tests.js', 'missing_tests');
  requireFile('tests/pilot-smoke-tests.js', 'missing_pilot_smoke_tests');
  requireFile('tests/smoke-tests.js', 'missing_smoke_tests');
  requireFile('tests/integration-tests.js', 'missing_integration_tests');
  requireFile('scripts/launch-gate.js', 'missing_launch_gate_script');
  requireFile('scripts/final-runtime-verify.js', 'missing_runtime_verify_script');
  requireFile('scripts/build-release-artifact.js', 'missing_release_artifact_script');
  requireFile('scripts/release-artifact-check.js', 'missing_release_artifact_check_script');
  requireFile('scripts/production-env-check.js', 'missing_production_env_check_script');
  requireFile('scripts/production-startup-check.js', 'missing_production_startup_check_script');
  requireFile('scripts/production-readiness-drill.js', 'missing_production_drill_script');
  requireFile('scripts/deployment-target-check.js', 'missing_deployment_target_check_script');
  requireFile('src/runtime-config-guard.js', 'missing_runtime_config_guard');
  requireFile('deploy/nginx/zsystems.conf.example', 'missing_deploy_nginx_template', 'warn');
  requireFile('deploy/systemd/zsystems.service.example', 'missing_deploy_systemd_template', 'warn');
  requireFile('docs/production-deployment-runbook.md', 'missing_production_deployment_runbook', 'warn');
  requireFile('scripts/generate-session-secret.js', 'missing_session_secret_script');
  requireFile('.env.production.example', 'missing_production_env_example', 'warn');
  requireFile('RELEASE_CHECKLIST.md', 'missing_release_checklist', 'warn');
  requireFile('UAT_PLAYBOOK.md', 'missing_uat_playbook', 'warn');
}

function collectPackageChecks({ findings, projectRoot }) {
  const push = (severity, code, message) => findings.push({ severity, code, message });
  let packageJson = {};
  try {
    packageJson = JSON.parse(readFile(projectRoot, 'package.json') || '{}');
  } catch {}
  const scripts = packageJson.scripts || {};
  if (!scripts.test || !String(scripts.test).includes('tests/run-tests.js')) push('error', 'missing_test_script', 'package.json must define a test script that includes tests/run-tests.js');
  if (!scripts['test:integration']) push('error', 'missing_integration_script', 'package.json must define test:integration');
  if (!scripts['smoke-test']) push('error', 'missing_smoke_script', 'package.json must define smoke-test');
  if (!scripts['test:pilot']) push('warn', 'missing_pilot_script', 'package.json should define test:pilot');
  if (!scripts['launch:gate']) push('error', 'missing_launch_gate_npm_script', 'package.json must define launch:gate');
  if (!scripts['launch:gate:prod']) push('warn', 'missing_launch_gate_prod_npm_script', 'package.json should define launch:gate:prod');
  if (!scripts['verify:runtime']) push('warn', 'missing_runtime_verify_npm_script', 'package.json should define verify:runtime');
  if (!scripts['release:artifact']) push('warn', 'missing_release_artifact_npm_script', 'package.json should define release:artifact');
  if (!scripts['release:artifact:check']) push('warn', 'missing_release_artifact_check_npm_script', 'package.json should define release:artifact:check');
  if (!scripts['env:secret']) push('warn', 'missing_env_secret_npm_script', 'package.json should define env:secret');
  if (!scripts['env:production:check']) push('warn', 'missing_env_check_npm_script', 'package.json should define env:production:check');
  if (!scripts['verify:production:startup']) push('warn', 'missing_production_startup_script', 'package.json should define verify:production:startup');
  if (!scripts['production:drill']) push('warn', 'missing_production_drill_script', 'package.json should define production:drill');
  if (!scripts['start:prod:safe']) push('warn', 'missing_safe_prod_start_script', 'package.json should define start:prod:safe');
  if (!scripts['deploy:target:check']) push('warn', 'missing_deploy_target_check_npm_script', 'package.json should define deploy:target:check');
}

function collectConfigChecks({ findings, config }) {
  const push = (severity, code, message) => findings.push({ severity, code, message });
  const sessionSecret = String(config.sessionSecret || '');
  if (!sessionSecret || sessionSecret === 'change-me-in-production' || sessionSecret === 'replace-with-a-long-random-secret') {
    push('error', 'session_secret', 'SESSION_SECRET is missing or still using a placeholder value');
  } else if (sessionSecret.length < 32) {
    push('error', 'session_secret_short', 'SESSION_SECRET must be at least 32 characters');
  }

  const minPasswordLength = Number(config.minAdminPasswordLength || 9);
  const defaultAdminPassword = String(config.defaultAdminPassword || '');
  if (defaultAdminPassword && defaultAdminPassword.length < minPasswordLength) {
    push('error', 'default_admin_password_short', `DEFAULT_ADMIN_PASSWORD must be at least ${minPasswordLength} characters`);
  }
  if (!defaultAdminPassword) {
    push('warn', 'default_admin_password_blank', 'DEFAULT_ADMIN_PASSWORD is blank. This is acceptable only if the first boot flow is controlled and documented');
  }

  if (config.allowLegacyStateWrite) push('error', 'legacy_state_write', 'ALLOW_LEGACY_STATE_WRITE must remain false before launch');
  if (config.allowResetUsers) push('error', 'reset_users_enabled', 'ALLOW_RESET_USERS must be false before launch');
  if (config.allowRestoreUsers) push('warn', 'restore_users_enabled', 'ALLOW_RESTORE_USERS is enabled. Keep it off unless you are performing a controlled restore');
  if (!config.requestLogging) push('warn', 'request_logging_disabled', 'REQUEST_LOGGING is disabled. This weakens support and incident investigation');
  if (!config.cookieSecure) push('error', 'cookie_secure', 'COOKIE_SECURE must be true for launch behind TLS');
  if (!config.enforceSameOriginWrites) push('error', 'same_origin_writes', 'ENFORCE_SAME_ORIGIN_WRITES must be true before launch');

  const origins = Array.isArray(config.allowedOrigins) ? config.allowedOrigins.filter(Boolean) : [];
  if (!origins.length) push('warn', 'allowed_origins_empty', 'ALLOWED_ORIGINS is empty. Define explicit origins for the production deployment');
  if (origins.some((origin) => /localhost|127\.0\.0\.1/i.test(String(origin)))) {
    push('warn', 'allowed_origins_localhost', 'ALLOWED_ORIGINS still contains localhost values');
  }
  if (String(config.logLevel || '').toLowerCase() === 'debug') {
    push('warn', 'debug_logging', 'LOG_LEVEL=debug may generate noisy production logs');
  }
  if (config.healthExposeDetails) {
    push('warn', 'health_details_exposed', 'HEALTH_EXPOSE_DETAILS is enabled. Disable detailed health output for public production exposure');
  }
}

function collectSourceChecks({ findings, projectRoot }) {
  const push = (severity, code, message) => findings.push({ severity, code, message });

  const runtimeContextSource = readFile(projectRoot, 'src/app/create-runtime-context.js');
  if (!runtimeContextSource) {
    push('error', 'runtime_context_unreadable', 'src/app/create-runtime-context.js could not be read');
  } else {
    if (!runtimeContextSource.includes('httpOnly: true')) push('error', 'session_http_only_missing', 'Session cookies must be httpOnly');
    if (!runtimeContextSource.includes("sameSite: config.cookieSecure ? 'strict' : 'lax'")) push('error', 'session_same_site_missing', 'Session cookies must tighten SameSite in secure mode');
    if (!runtimeContextSource.includes('secure: config.cookieSecure')) push('error', 'session_secure_binding_missing', 'Session cookies must bind secure to COOKIE_SECURE');
    if (!runtimeContextSource.includes('Content-Security-Policy')) push('error', 'csp_header_missing', 'The app must set Content-Security-Policy headers');
    if (!runtimeContextSource.includes("script-src 'self' 'nonce-${res.locals.cspNonce}' 'strict-dynamic'")) push('error', 'csp_nonce_missing', 'CSP must use nonce-based script-src with strict-dynamic');
    if (runtimeContextSource.includes("script-src 'self' 'unsafe-inline'")) push('error', 'csp_unsafe_inline', 'CSP must not allow unsafe-inline scripts');
    if (!runtimeContextSource.includes('Strict-Transport-Security')) push('warn', 'hsts_missing', 'Production runtime should send Strict-Transport-Security');
    if (!runtimeContextSource.includes('X-Content-Type-Options')) push('warn', 'x_content_type_options_missing', 'Runtime should send X-Content-Type-Options');
    if (!runtimeContextSource.includes('X-Frame-Options')) push('warn', 'x_frame_options_missing', 'Runtime should send X-Frame-Options');
    if (!runtimeContextSource.includes('Referrer-Policy')) push('warn', 'referrer_policy_missing', 'Runtime should send Referrer-Policy');
    if (!runtimeContextSource.includes('Cross-Origin-Opener-Policy')) push('warn', 'coop_missing', 'Runtime should send Cross-Origin-Opener-Policy');
    if (!runtimeContextSource.includes('enforceSameOriginWrites')) push('error', 'same_origin_guard_missing', 'Runtime must enforce same-origin writes');
  }

  const backupRouteSource = readFile(projectRoot, 'src/system-routes/register-backup-routes.js');
  if (!backupRouteSource) {
    push('error', 'backup_routes_unreadable', 'src/system-routes/register-backup-routes.js could not be read');
  } else {
    if (!backupRouteSource.includes("app.post('/api/backup/restore'")) push('error', 'backup_restore_route_missing', 'Backup restore route is missing');
    if (!backupRouteSource.includes("requireAnyPermission(['canManageBackups'])")) push('error', 'backup_permissions', 'Backup routes must require canManageBackups');
    if (!backupRouteSource.includes('restoreRateLimit(')) push('error', 'restore_rate_limit_missing', 'Backup restore route must enforce a restore rate limit');
    if (!backupRouteSource.includes('Too many restore attempts. Try again later.')) push('warn', 'restore_rate_limit_message_missing', 'Restore route should expose a rate limit message');
    if (!backupRouteSource.includes("const dryRun = String((req.query || {}).dryRun || '').toLowerCase() === 'true';")) push('error', 'restore_dry_run_missing', 'Backup restore route must support dry-run mode');
    if (!backupRouteSource.includes('res.json({ ok: true, ...restoreResult });')) push('error', 'restore_response_contract_missing', 'Backup restore route must return a structured restore envelope');
  }

  const backupSource = readFile(projectRoot, 'src/backup-service.js');
  if (backupSource) {
    if (!backupSource.includes('validatePostRestoreState')) push('error', 'post_restore_validation_missing', 'Backup restore service must validate post-restore state');
    if (!backupSource.includes('options && options.dryRun')) push('error', 'restore_dry_run_service_missing', 'Backup restore service must support dry-run validation');
  }

  const serverSource = readFile(projectRoot, 'src/server.js');
  if (!serverSource) {
    push('error', 'server_unreadable', 'src/server.js could not be read');
  } else {
    if (!serverSource.includes('createBackupRestoreService')) push('error', 'backup_restore_marker_missing', 'Legacy regression compatibility marker for backup restore is missing');
    if (!serverSource.includes("app.post('/api/inventory-adjustments'")) push('error', 'inventory_adjustment_route_missing', 'Inventory adjustment endpoint marker is missing');
    if (!serverSource.includes("app.post('/api/stock-transfers'")) push('error', 'stock_transfer_route_missing', 'Stock transfer endpoint marker is missing');
    if (!serverSource.includes('/api/stock-transfers/:id/receive')) push('error', 'stock_transfer_receive_route_missing', 'Stock transfer receive endpoint marker is missing');
    if (!serverSource.includes('Price changes require canEditPrice permission')) push('error', 'price_permission_guard_missing', 'Product price changes must be protected by canEditPrice');
  }

  const reactIndexSource = readFile(projectRoot, 'frontend/index.html');
  const reactDistIndexSource = readFile(projectRoot, 'frontend/dist/index.html');
  const reactPackageSource = readFile(projectRoot, 'frontend/package.json');
  if (reactIndexSource) {
    if (!reactIndexSource.includes('<div id="root"></div>')) push('error', 'react_root_missing', 'frontend/index.html must include a root div');
    if (!reactIndexSource.includes('/src/main.tsx')) push('error', 'react_entry_missing', 'frontend/index.html must include the Vite entry');
  }
  if (reactPackageSource) {
    let pkg = {};
    try { pkg = JSON.parse(reactPackageSource); } catch {}
    const scripts = pkg.scripts || {};
    if (!scripts.build) push('error', 'react_build_script_missing', 'frontend/package.json must define build');
    if (!scripts.dev) push('warn', 'react_dev_script_missing', 'frontend/package.json should define dev');
  }
  if (reactDistIndexSource && !reactDistIndexSource.includes('id="root"')) {
    push('warn', 'react_dist_root_missing', 'frontend/dist/index.html should include the root element after build');
  }
}

module.exports = {
  collectFileChecks,
  collectPackageChecks,
  collectConfigChecks,
  collectSourceChecks,
};
