#!/usr/bin/env node
const db = require('../src/db');
const { createPasswordRecord } = require('../src/security');
const config = require('../src/config');

function fail(message, exitCode = 1) {
  console.error(`[reset-admin-password] ${message}`);
  try { db.close(); } catch (_) {}
  process.exit(exitCode);
}

const username = String(process.argv[2] || config.defaultAdminUsername || '').trim();
const nextPassword = String(process.argv[3] || '').trim();

if (!username) fail('username is required. Usage: node scripts/reset-admin-password.js <username> <new-password>');
if (!nextPassword) fail('new password is required. Usage: node scripts/reset-admin-password.js <username> <new-password>');
if (nextPassword.length < Number(config.minAdminPasswordLength || 9)) {
  fail(`new password must be at least ${Number(config.minAdminPasswordLength || 9)} characters long`);
}

const existingUser = db.prepare('SELECT id, username, role, is_active FROM users WHERE lower(username) = lower(?) LIMIT 1').get(username);
if (!existingUser) fail(`user not found: ${username}`, 2);

const hasUpdatedAt = db.prepare("SELECT 1 AS ok FROM pragma_table_info('users') WHERE name = 'updated_at' LIMIT 1").get();
const { salt, hash } = createPasswordRecord(nextPassword);
const updateSql = hasUpdatedAt
  ? `UPDATE users SET password_hash = ?, password_salt = ?, failed_login_count = 0, locked_until = NULL, must_change_password = 0, is_active = 1, updated_at = datetime('now') WHERE id = ?`
  : `UPDATE users SET password_hash = ?, password_salt = ?, failed_login_count = 0, locked_until = NULL, must_change_password = 0, is_active = 1 WHERE id = ?`;
const result = db.prepare(updateSql).run(hash, salt, existingUser.id);

console.log(JSON.stringify({
  ok: result.changes > 0,
  username: existingUser.username,
  role: existingUser.role,
  updated: result.changes,
  message: 'password reset; failed_login_count cleared; locked_until cleared; account activated'
}, null, 2));

db.close();
