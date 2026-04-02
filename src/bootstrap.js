const db = require('./db');
const { createPasswordRecord } = require('./security');
const config = require('./config');
const { validateDefaultAdminPassword } = require('./validation');
const { ROLE_PRESETS } = require('./role-presets');

const SUPER_ADMIN_PERMS = [...ROLE_PRESETS.super_admin.permissions];
const BUNDLED_DEFAULT_ADMIN_PASSWORD = 'infoadmin';

function ensureSetting(key, value) {
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function buildBootstrapPasswordPlan() {
  const username = String(config.defaultAdminUsername || 'ZS').trim() || 'ZS';
  const providedPassword = validateDefaultAdminPassword(config.defaultAdminPassword, config.minAdminPasswordLength);

  if (providedPassword) {
    return {
      username,
      initialPassword: providedPassword,
      providedPassword,
      passwordSource: 'env',
      mustChangePassword: false,
      isBundledDefault: false,
    };
  }

  if (config.isProduction) {
    const err = new Error('DEFAULT_ADMIN_PASSWORD must be provided for the initial production bootstrap or the first super admin must already exist.');
    err.code = 'BOOTSTRAP_ADMIN_PASSWORD_REQUIRED';
    throw err;
  }

  return {
    username,
    initialPassword: BUNDLED_DEFAULT_ADMIN_PASSWORD,
    providedPassword: '',
    passwordSource: 'bundled-default',
    mustChangePassword: false,
    isBundledDefault: true,
  };
}

function warnBundledDefaultCredentials(passwordPlan) {
  if (!passwordPlan.isBundledDefault) return;
  console.warn(`[BOOTSTRAP] Using bundled development admin credentials for first install: ${passwordPlan.username} / ${passwordPlan.initialPassword}`);
  console.warn('[BOOTSTRAP] Create a lower-privilege admin user for daily operations and rotate the super admin password after installation.');
}

function warnDefaultAdminPasswordIgnored(existingUserId, passwordPlan) {
  if (!passwordPlan.providedPassword && !passwordPlan.isBundledDefault) return;
  console.warn(`[BOOTSTRAP] Existing super admin detected (user #${existingUserId}). bootstrap admin credentials are ignored after first bootstrap.`);
  console.warn('[BOOTSTRAP] Use node scripts/reset-admin-password.js <username> <new-password> to rotate credentials on an existing database.');
}

function ensurePrimarySuperAdmin() {
  const passwordPlan = buildBootstrapPasswordPlan();
  const existingSuper = db.prepare("SELECT id, username FROM users WHERE role = 'super_admin' LIMIT 1").get();
  if (existingSuper) {
    warnDefaultAdminPasswordIgnored(existingSuper.id, passwordPlan);
    return;
  }

  const existingByUsername = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?) LIMIT 1').get(passwordPlan.username);
  if (existingByUsername) {
    db.prepare(`
      UPDATE users
      SET role = 'super_admin', is_active = 1, permissions_json = ?, display_name = COALESCE(NULLIF(display_name, ''), username)
      WHERE id = ?
    `).run(JSON.stringify(SUPER_ADMIN_PERMS), existingByUsername.id);
    const { salt, hash } = createPasswordRecord(passwordPlan.initialPassword);
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?').run(hash, salt, passwordPlan.mustChangePassword ? 1 : 0, existingByUsername.id);
    warnBundledDefaultCredentials(passwordPlan);
    return;
  }

  const { salt, hash } = createPasswordRecord(passwordPlan.initialPassword);
  db.prepare(`
    INSERT INTO users (username, password_hash, password_salt, role, is_active, permissions_json, display_name, must_change_password)
    VALUES (?, ?, ?, 'super_admin', 1, ?, ?, ?)
  `).run(passwordPlan.username, hash, salt, JSON.stringify(SUPER_ADMIN_PERMS), 'حساب الإدارة الرئيسي', passwordPlan.mustChangePassword ? 1 : 0);

  warnBundledDefaultCredentials(passwordPlan);
}

function bootstrap() {
  ensureSetting('storeName', config.defaultStoreName);
  ensureSetting('theme', 'dark');
  ensurePrimarySuperAdmin();
}

module.exports = bootstrap;
