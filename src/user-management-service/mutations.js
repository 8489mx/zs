const { safeJsonParse } = require('./shared');

function createUserManagementMutations({
  db,
  createPasswordRecord,
  revokeSessionsForUser,
  defaultAdminPermissions,
  normalization,
}) {
  const { defaultUsersState, normalizeManagedUserInput } = normalization;

  function getManagedUserRowById(userId) {
    const numericId = Number(userId);
    if (!Number.isFinite(numericId) || numericId <= 0) return null;
    return db.prepare('SELECT * FROM users WHERE id = ?').get(numericId) || null;
  }

  function requireManagedUser(userId) {
    const user = getManagedUserRowById(userId);
    if (!user) {
      const err = new Error('المستخدم غير موجود');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  function ensureUniqueUsername(username, excludeUserId = null) {
    const normalized = String(username || '').trim();
    const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) LIMIT 1').get(normalized);
    if (!existing) return;
    if (excludeUserId && String(existing.id) === String(excludeUserId)) return;
    const err = new Error('اسم المستخدم مستخدم بالفعل');
    err.statusCode = 400;
    throw err;
  }

  function ensureActiveAdminRemaining({ excludeUserId = null, role = 'admin', isActive = true, deleting = false } = {}) {
    const keepsAdmin = !deleting && (role === 'super_admin' || role === 'admin') && isActive !== false;
    if (keepsAdmin) return;
    const row = excludeUserId
      ? db.prepare("SELECT COUNT(*) AS total FROM users WHERE role IN ('super_admin','admin') AND is_active = 1 AND id <> ?").get(Number(excludeUserId))
      : db.prepare("SELECT COUNT(*) AS total FROM users WHERE role IN ('super_admin','admin') AND is_active = 1").get();
    if (Number((row || {}).total || 0) > 0) return;
    const err = new Error('لا يمكن إزالة آخر مدير نشط في النظام');
    err.statusCode = 400;
    throw err;
  }

  function revokeManagedUserSessions(userId, keepSessionId = null) {
    return revokeSessionsForUser(userId, keepSessionId || null);
  }

  function hasManagedUserSecurityChange(existing, nextUser, passwordProvided) {
    const currentPermissions = JSON.stringify(Array.isArray(safeJsonParse(existing.permissions_json || '[]', [])) ? safeJsonParse(existing.permissions_json || '[]', []) : []);
    const nextPermissions = JSON.stringify(Array.isArray(nextUser.permissions) ? nextUser.permissions : []);
    const currentBranches = JSON.stringify(Array.isArray(safeJsonParse(existing.branch_ids_json || '[]', [])) ? safeJsonParse(existing.branch_ids_json || '[]', []) : []);
    const nextBranches = JSON.stringify(Array.isArray(nextUser.branchIds) ? nextUser.branchIds : []);
    return Boolean(
      passwordProvided
      || String(existing.username || '').trim().toLowerCase() != String(nextUser.username || '').trim().toLowerCase()
      || String(existing.role || '').trim() !== String(nextUser.role || '').trim()
      || Number(existing.is_active || 0) !== (nextUser.isActive ? 1 : 0)
      || Number(existing.must_change_password || 0) !== (nextUser.mustChangePassword ? 1 : 0)
      || String(existing.default_branch_id || '') !== String(nextUser.defaultBranchId || '')
      || currentPermissions !== nextPermissions
      || currentBranches !== nextBranches
    );
  }

  function createManagedUser(payload) {
    const user = normalizeManagedUserInput(payload, { requirePassword: true });
    ensureUniqueUsername(user.username);
    if (user.role === 'cashier') {
      ensureActiveAdminRemaining({ role: user.role, isActive: user.isActive, deleting: false });
    }
    const { salt, hash } = createPasswordRecord(user.password);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, password_salt, role, is_active, permissions_json, display_name, branch_ids_json, default_branch_id, must_change_password, failed_login_count, locked_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `).run(
      user.username,
      hash,
      salt,
      user.role,
      user.isActive ? 1 : 0,
      JSON.stringify(user.permissions),
      user.name || user.username,
      JSON.stringify(user.branchIds),
      user.defaultBranchId ? Number(user.defaultBranchId) : null,
      user.mustChangePassword ? 1 : 0,
    );
    return requireManagedUser(result.lastInsertRowid);
  }

  function updateManagedUser(userId, payload, actorUserId = null, actorRole = 'cashier', actorSessionId = null) {
    const existing = requireManagedUser(userId);
    const user = normalizeManagedUserInput(payload, { requirePassword: false });
    const isExistingSuperAdmin = existing.role === 'super_admin';
    const isActorSuperAdmin = actorRole === 'super_admin';
    if (isExistingSuperAdmin) {
      if (!isActorSuperAdmin) {
        const err = new Error('تعديل حساب السوبر أدمن مسموح للسوبر أدمن فقط');
        err.statusCode = 403;
        throw err;
      }
      user.role = 'super_admin';
      user.permissions = [...defaultAdminPermissions];
      user.isActive = true;
    } else if (user.role === 'super_admin' && !isActorSuperAdmin) {
      const err = new Error('إنشاء أو ترقية سوبر أدمن مسموح للسوبر أدمن فقط');
      err.statusCode = 403;
      throw err;
    }
    ensureUniqueUsername(user.username, existing.id);
    if (actorUserId && String(existing.id) === String(actorUserId) && user.isActive === false) {
      const err = new Error('لا يمكن إيقاف المستخدم الحالي');
      err.statusCode = 400;
      throw err;
    }
    ensureActiveAdminRemaining({ excludeUserId: existing.id, role: user.role, isActive: user.isActive, deleting: false });
    const securityChange = hasManagedUserSecurityChange(existing, user, Boolean(user.password));
    db.prepare(`
      UPDATE users
      SET username = ?, role = ?, is_active = ?, permissions_json = ?, display_name = ?, branch_ids_json = ?, default_branch_id = ?, must_change_password = ?
      WHERE id = ?
    `).run(
      user.username,
      user.role,
      user.isActive ? 1 : 0,
      JSON.stringify(user.permissions),
      user.name || user.username,
      JSON.stringify(user.branchIds),
      user.defaultBranchId ? Number(user.defaultBranchId) : null,
      user.mustChangePassword ? 1 : 0,
      existing.id,
    );
    if (user.password) {
      const { salt, hash } = createPasswordRecord(user.password);
      db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0, failed_login_count = 0, locked_until = NULL WHERE id = ?')
        .run(hash, salt, existing.id);
    }
    if (securityChange) {
      const keepSessionId = actorUserId && String(existing.id) === String(actorUserId) ? actorSessionId : null;
      revokeManagedUserSessions(existing.id, keepSessionId);
    }
    return requireManagedUser(existing.id);
  }

  function deleteManagedUser(userId, actorUserId = null) {
    const existing = requireManagedUser(userId);
    if (existing.role === 'super_admin') {
      const err = new Error('لا يمكن حذف حساب السوبر أدمن');
      err.statusCode = 400;
      throw err;
    }
    if (actorUserId && String(existing.id) === String(actorUserId)) {
      const err = new Error('لا يمكن حذف المستخدم الحالي');
      err.statusCode = 400;
      throw err;
    }
    ensureActiveAdminRemaining({ excludeUserId: existing.id, deleting: true });
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
    });
    tx();
    return existing;
  }

  function unlockManagedUser(userId, actorRole = 'cashier') {
    const existing = requireManagedUser(userId);
    if (existing.role === 'super_admin' && actorRole !== 'super_admin') {
      const err = new Error('فتح حساب السوبر أدمن مسموح للسوبر أدمن فقط');
      err.statusCode = 403;
      throw err;
    }
    db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?').run(existing.id);
    return requireManagedUser(existing.id);
  }

  return {
    defaultUsersState,
    createManagedUser,
    updateManagedUser,
    deleteManagedUser,
    unlockManagedUser,
  };
}

module.exports = { createUserManagementMutations };
