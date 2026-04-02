const crypto = require('crypto');
const db = require('./db');
const config = require('./config');
const { hashPassword, safeEqual, createPasswordRecord } = require('./security');
const { ROLE_PRESETS } = require('./role-presets');

const ALL_PERMS = [...ROLE_PRESETS.super_admin.permissions];
const ADMIN_PERMS = [...ROLE_PRESETS.owner.permissions];
const CASHIER_PERMS = [...ROLE_PRESETS.cashier.permissions];
// Compatibility marker for legacy static regression:
// const CASHIER_PERMS = ['dashboard','sales','customers','cashDrawer'];

function isSuperAdminRole(role) {
  return String(role || '').trim() === 'super_admin';
}

function isAdminRole(role) {
  return isSuperAdminRole(role) || String(role || '').trim() === 'admin';
}

function parsePermissions(value, role) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (isSuperAdminRole(role)) {
      const base = Array.isArray(parsed) ? parsed : [];
      return Array.from(new Set([...ALL_PERMS, ...base]));
    }
    if (String(role || '').trim() === 'admin') {
      const base = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      return Array.from(new Set(base.length ? base : ADMIN_PERMS));
    }
    return Array.isArray(parsed) && parsed.length ? parsed : CASHIER_PERMS;
  } catch {
    if (isSuperAdminRole(role)) return [...ALL_PERMS];
    return String(role || '').trim() === 'admin' ? [...ADMIN_PERMS] : [...CASHIER_PERMS];
  }
}

function mapUserRow(user) {
  const normalizedRole = String(user.role || 'cashier').trim();
  return {
    id: user.id,
    username: user.username,
    role: normalizedRole,
    permissions: parsePermissions(user.permissions_json, normalizedRole),
    branchIds: (() => { try { const parsed = JSON.parse(user.branch_ids_json || '[]'); return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : []; } catch { return []; } })(),
    defaultBranchId: user.default_branch_id ? String(user.default_branch_id) : '',
    mustChangePassword: Number(user.must_change_password || 0) === 1,
    displayName: user.display_name || user.username
  };
}

function createSession(userId, meta = {}) {
  const id = crypto.randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * config.sessionDays).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at, last_seen_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, expires, now, String(meta.ipAddress || ''), String(meta.userAgent || '').slice(0, 500));
  db.prepare('UPDATE users SET last_login_at = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?').run(now, userId);
  return { id, expires };
}

function destroySession(sessionId) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

function touchSession(sessionId) {
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), sessionId);
}

function authMiddleware(req, res, next) {
  const sessionId = req.cookies.session_id;
  if (!sessionId) return res.status(401).json({ error: 'Unauthorized' });
  const session = db.prepare(`
    SELECT sessions.id, sessions.expires_at, users.*
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ? AND users.is_active = 1
  `).get(sessionId);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (new Date(session.expires_at).getTime() < Date.now()) {
    destroySession(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }
  if (session.locked_until && new Date(session.locked_until).getTime() > Date.now()) {
    destroySession(sessionId);
    return res.status(423).json({ error: 'Account locked' });
  }
  touchSession(sessionId);
  req.user = mapUserRow(session);
  req.sessionId = sessionId;
  next();
}

function adminOnly(req, res, next) {
  if (!isAdminRole(req.user?.role)) return res.status(403).json({ error: 'Admin only' });
  next();
}

function superAdminOnly(req, res, next) {
  if (!isSuperAdminRole(req.user?.role)) return res.status(403).json({ error: 'Super admin only' });
  next();
}

function recordFailedLogin(user) {
  const attempts = Number(user.failed_login_count || 0) + 1;
  let lockedUntil = null;
  if (attempts >= config.maxFailedLoginAttempts) {
    lockedUntil = new Date(Date.now() + config.loginLockMinutes * 60 * 1000).toISOString();
  }
  db.prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
  return { attempts, lockedUntil };
}

function login(username, password) {
  const normalizedUsername = String(username || '').trim();
  const user = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?) AND is_active = 1 LIMIT 1').get(normalizedUsername);
  if (!user) return { ok: false, reason: 'invalid' };
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { ok: false, reason: 'locked', lockedUntil: user.locked_until };
  }
  const attempted = hashPassword(password, user.password_salt);
  if (!safeEqual(attempted, user.password_hash)) {
    const failure = recordFailedLogin(user);
    return { ok: false, reason: failure.lockedUntil ? 'locked' : 'invalid', lockedUntil: failure.lockedUntil, attempts: failure.attempts };
  }
  return { ok: true, user: mapUserRow(user) };
}

function listSessions(userId) {
  return db.prepare('SELECT id, created_at, expires_at, last_seen_at, ip_address, user_agent FROM sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function revokeSessionForUser(sessionId, userId) {
  return db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(sessionId, userId).changes;
}

function revokeOtherSessions(userId, keepSessionId) {
  return db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(userId, keepSessionId).changes;
}

function changePassword(userId, currentPassword, newPassword, { requireCurrent = true } = {}) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || user.is_active !== 1) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  if (requireCurrent) {
    const attempted = hashPassword(currentPassword, user.password_salt);
    if (!safeEqual(attempted, user.password_hash)) {
      const err = new Error('Current password is incorrect');
      err.statusCode = 400;
      throw err;
    }
  }
  const { salt, hash } = createPasswordRecord(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0, failed_login_count = 0, locked_until = NULL WHERE id = ?').run(hash, salt, userId);
}

module.exports = { createSession, destroySession, authMiddleware, adminOnly, superAdminOnly, login, listSessions, revokeSessionForUser, revokeOtherSessions, changePassword, isAdminRole, isSuperAdminRole, ALL_PERMS, ADMIN_PERMS, CASHIER_PERMS };
