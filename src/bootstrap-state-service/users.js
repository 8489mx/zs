function createBootstrapUserOps({
  db,
  config,
  createPasswordRecord,
  defaultAdminPermissions,
  defaultCashierPermissions,
  shared,
}) {
  function ensureDefaultUsers() {
    const tx = db.transaction(() => {
      const users = [
        { username: String(config.defaultAdminUsername || 'ZS').trim() || 'ZS', password: String(config.defaultAdminPassword || '').trim(), role: 'super_admin', permissions: defaultAdminPermissions }
      ];
      for (const user of users) {
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(user.username);
        const permsJson = JSON.stringify(user.permissions);
        if (existing) {
          const existingAdmin = db.prepare("SELECT id FROM users WHERE role IN ('super_admin','admin') AND is_active = 1 LIMIT 1").get();
          if (!existingAdmin) {
            db.prepare('UPDATE users SET role = ?, is_active = 1, permissions_json = ? WHERE id = ?').run(user.role, permsJson, existing.id);
          }
        } else if (user.password) {
          const { salt, hash } = createPasswordRecord(user.password);
          db.prepare('INSERT INTO users (username, password_hash, password_salt, role, is_active, permissions_json, must_change_password) VALUES (?, ?, ?, ?, 1, ?, 0)').run(user.username, hash, salt, user.role, permsJson);
        }
      }
    });
    tx();
  }

  function restoreUsersFromBackup(users) {
    if (!Array.isArray(users) || !users.length) return;
    const cleaned = users
      .map((u) => ({
        username: String(u.username || '').trim(),
        role: u.role === 'super_admin' ? 'super_admin' : u.role === 'cashier' ? 'cashier' : 'admin',
        isActive: Number(u.is_active) === 0 ? 0 : 1,
        permissionsJson: typeof u.permissions_json === 'string' && u.permissions_json.trim() ? u.permissions_json : JSON.stringify(u.role === 'cashier' ? defaultCashierPermissions : defaultAdminPermissions),
        displayName: String(u.display_name || u.username || '').trim(),
        branchIdsJson: typeof u.branch_ids_json === 'string' && u.branch_ids_json.trim() ? u.branch_ids_json : '[]',
        defaultBranchId: u.default_branch_id ? Number(u.default_branch_id) : null,
        passwordHash: String(u.password_hash || '').trim(),
        passwordSalt: String(u.password_salt || '').trim(),
      }))
      .filter((u) => u.username && u.passwordHash && u.passwordSalt);

    if (!cleaned.length) return;
    if (!cleaned.some((u) => (u.role === 'super_admin' || u.role === 'admin') && u.isActive === 1)) {
      throw new Error('Backup must contain at least one active admin user');
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM users').run();
      for (const user of cleaned) {
        db.prepare(`
          INSERT INTO users (username, password_hash, password_salt, role, is_active, permissions_json, display_name, branch_ids_json, default_branch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(user.username, user.passwordHash, user.passwordSalt, user.role, user.isActive, user.permissionsJson, user.displayName || user.username, user.branchIdsJson, user.defaultBranchId);
      }
    });

    tx();
  }

  function syncUsers(incomingUsers, options = {}) {
    const actorUserId = options.actorUserId ? String(options.actorUserId) : '';
    const actorSessionId = options.actorSessionId ? String(options.actorSessionId) : '';
    const existing = db.prepare('SELECT * FROM users').all();
    const existingById = new Map(existing.map((u) => [String(u.id), u]));
    const existingByUsername = new Map(existing.map((u) => [String(u.username || '').trim().toLowerCase(), u]));

    const cleaned = Array.isArray(incomingUsers)
      ? incomingUsers
          .map((u) => ({
            id: u.id ? String(u.id) : null,
            username: String(u.username || '').trim(),
            password: String(u.password || '').trim(),
            role: u.role === 'super_admin' ? 'super_admin' : u.role === 'cashier' ? 'cashier' : 'admin',
            permissions: Array.isArray(u.permissions) ? u.permissions : (u.role === 'cashier' ? defaultCashierPermissions : defaultAdminPermissions),
            name: String(u.name || u.username || '').trim(),
            ...shared.normalizeBranchScopeInput(Array.isArray(u.branchIds) ? u.branchIds.map((value) => String(value)).filter(Boolean) : [], u.defaultBranchId ? String(u.defaultBranchId) : ''),
            isActive: u.isActive !== false,
            mustChangePassword: u.mustChangePassword === true,
          }))
          .filter((u) => u.username)
      : [];

    if (!cleaned.some((u) => (u.role === 'super_admin' || u.role === 'admin') && u.isActive)) throw new Error('At least one active admin user is required');

    const tx = db.transaction(() => {
      const keptIds = new Set();
      for (const user of cleaned) {
        const found = (user.id && existingById.get(user.id)) || existingByUsername.get(String(user.username || '').trim().toLowerCase());
        if (found) {
          if (actorUserId && String(found.id) === actorUserId && user.isActive === false) throw new Error('Cannot deactivate the current user');
          const securityChange = shared.hasManagedUserSecurityChange(found, user, Boolean(user.password));
          db.prepare('UPDATE users SET username = ?, role = ?, is_active = ?, permissions_json = ?, display_name = ?, branch_ids_json = ?, default_branch_id = ?, must_change_password = ? WHERE id = ?')
            .run(user.username, user.role, user.isActive ? 1 : 0, JSON.stringify(user.permissions), user.name || user.username, JSON.stringify(user.branchIds), user.defaultBranchId ? Number(user.defaultBranchId) : null, user.mustChangePassword ? 1 : 0, found.id);
          if (user.password) {
            const { salt, hash } = createPasswordRecord(user.password);
            db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0, failed_login_count = 0, locked_until = NULL WHERE id = ?').run(hash, salt, found.id);
          }
          if (securityChange) {
            const keepSessionId = actorUserId && String(found.id) === actorUserId ? actorSessionId : null;
            shared.revokeManagedUserSessions(found.id, keepSessionId);
          }
          keptIds.add(String(found.id));
        } else {
          if (!user.password) throw new Error(`Password is required for new user: ${user.username}`);
          const { salt, hash } = createPasswordRecord(user.password);
          const result = db.prepare('INSERT INTO users (username, password_hash, password_salt, role, is_active, permissions_json, display_name, branch_ids_json, default_branch_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(user.username, hash, salt, user.role, user.isActive ? 1 : 0, JSON.stringify(user.permissions), user.name || user.username, JSON.stringify(user.branchIds), user.defaultBranchId ? Number(user.defaultBranchId) : null, user.mustChangePassword ? 1 : 0);
          keptIds.add(String(result.lastInsertRowid));
        }
      }

      for (const oldUser of existing) {
        if (!keptIds.has(String(oldUser.id))) {
          if (actorUserId && String(oldUser.id) === actorUserId) throw new Error('Cannot delete the current user');
          db.prepare('DELETE FROM sessions WHERE user_id = ?').run(oldUser.id);
          db.prepare('DELETE FROM users WHERE id = ?').run(oldUser.id);
        }
      }
    });

    tx();
  }

  function backfillAdminPermissions() {
    db.prepare("UPDATE users SET permissions_json = ? WHERE role = 'admin' AND (permissions_json IS NULL OR permissions_json = '' OR permissions_json = '[]')").run(JSON.stringify(defaultAdminPermissions));
  }

  return {
    ensureDefaultUsers,
    restoreUsersFromBackup,
    syncUsers,
    backfillAdminPermissions,
  };
}

module.exports = { createBootstrapUserOps };
