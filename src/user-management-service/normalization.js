const { safeJsonParse } = require('./shared');

function createUserManagementNormalization({
  db,
  config,
  normalizeText,
  defaultAdminPermissions,
  defaultOperatorPermissions,
  defaultCashierPermissions,
}) {
  function normalizeBranchScopeInput(branchIds = [], defaultBranchId = '') {
    const uniqueBranchIds = Array.from(new Set((Array.isArray(branchIds) ? branchIds : []).map((value) => String(value || '').trim()).filter(Boolean)));
    const normalizedDefaultBranchId = String(defaultBranchId || '').trim();
    const numericBranchIds = uniqueBranchIds.map((value) => Number(value));
    if (numericBranchIds.some((value) => !Number.isInteger(value) || value <= 0)) {
      const err = new Error('صلاحيات الفروع تحتوي على معرفات غير صالحة');
      err.statusCode = 400;
      throw err;
    }
    if (normalizedDefaultBranchId) {
      const numericDefaultBranchId = Number(normalizedDefaultBranchId);
      if (!Number.isInteger(numericDefaultBranchId) || numericDefaultBranchId <= 0) {
        const err = new Error('الفرع الافتراضي غير صالح');
        err.statusCode = 400;
        throw err;
      }
      if (!uniqueBranchIds.includes(String(numericDefaultBranchId))) uniqueBranchIds.push(String(numericDefaultBranchId));
    }
    if (!uniqueBranchIds.length && normalizedDefaultBranchId) {
      const err = new Error('يجب اختيار الفرع الافتراضي من الفروع المسموح بها');
      err.statusCode = 400;
      throw err;
    }
    if (uniqueBranchIds.length) {
      const placeholders = uniqueBranchIds.map(() => '?').join(',');
      const rows = db.prepare(`SELECT id FROM branches WHERE is_active = 1 AND id IN (${placeholders})`).all(...uniqueBranchIds.map((value) => Number(value)));
      const availableIds = new Set(rows.map((entry) => String(entry.id)));
      const missing = uniqueBranchIds.filter((value) => !availableIds.has(String(Number(value))));
      if (missing.length) {
        const err = new Error('يوجد فرع غير موجود أو غير نشط ضمن صلاحيات المستخدم');
        err.statusCode = 400;
        throw err;
      }
    }
    return {
      branchIds: uniqueBranchIds.map((value) => String(Number(value))),
      defaultBranchId: normalizedDefaultBranchId ? String(Number(normalizedDefaultBranchId)) : '',
    };
  }

  function defaultUsersState(options = {}) {
    const includeInactive = options && options.includeInactive === true;
    const query = includeInactive
      ? 'SELECT * FROM users ORDER BY id ASC'
      : 'SELECT * FROM users WHERE is_active = 1 ORDER BY id ASC';
    return db.prepare(query).all().map((u) => ({
      id: String(u.id),
      username: u.username,
      password: '',
      role: u.role,
      permissions: safeJsonParse(
        u.permissions_json || '[]',
        u.role === 'super_admin' ? defaultAdminPermissions : u.role === 'admin' ? defaultOperatorPermissions : defaultCashierPermissions,
      ),
      name: u.display_name || u.username,
      branchIds: safeJsonParse(u.branch_ids_json || '[]', []).map((v) => String(v)),
      defaultBranchId: u.default_branch_id ? String(u.default_branch_id) : '',
      isActive: Number(u.is_active) === 1,
      mustChangePassword: Number(u.must_change_password || 0) === 1,
      failedLoginCount: Number(u.failed_login_count || 0),
      lockedUntil: u.locked_until || null,
      lastLoginAt: u.last_login_at || null,
    }));
  }

  function normalizeManagedUserInput(input, { requirePassword = false } = {}) {
    const payload = input || {};
    const role = payload.role === 'super_admin' ? 'super_admin' : payload.role === 'admin' ? 'admin' : 'cashier';
    const username = normalizeText(payload.username, 50);
    const password = String(payload.password || '').trim();
    const name = normalizeText(payload.name || payload.username, 120);
    const branchIds = Array.isArray(payload.branchIds)
      ? payload.branchIds.map((value) => normalizeText(value, 40)).filter(Boolean)
      : [];
    const defaultBranchId = normalizeText(payload.defaultBranchId, 40);
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.map((value) => normalizeText(value, 80)).filter(Boolean)
      : [];
    const uniquePermissions = Array.from(
      new Set(
        (role === 'super_admin'
          ? [...defaultAdminPermissions, ...permissions]
          : role === 'admin'
            ? (permissions.length ? permissions : defaultOperatorPermissions)
            : permissions.length
              ? permissions
              : defaultCashierPermissions).filter(Boolean),
      ),
    );
    const normalizedBranchScope = normalizeBranchScopeInput(branchIds, defaultBranchId);
    const requiredLength = Math.max(8, Number(config.minAdminPasswordLength || 10));

    if (!username) {
      const err = new Error('اسم المستخدم مطلوب');
      err.statusCode = 400;
      throw err;
    }
    if (requirePassword && !password) {
      const err = new Error('كلمة المرور مطلوبة للمستخدم الجديد');
      err.statusCode = 400;
      throw err;
    }
    if (password && password.length < requiredLength) {
      const err = new Error(`كلمة المرور يجب أن تكون ${requiredLength} أحرف على الأقل`);
      err.statusCode = 400;
      throw err;
    }

    return {
      username,
      password,
      role,
      permissions: uniquePermissions,
      name: name || username,
      branchIds: normalizedBranchScope.branchIds,
      defaultBranchId: normalizedBranchScope.defaultBranchId,
      isActive: payload.isActive !== false,
      mustChangePassword: payload.mustChangePassword === true,
    };
  }

  return {
    normalizeBranchScopeInput,
    defaultUsersState,
    normalizeManagedUserInput,
  };
}

module.exports = { createUserManagementNormalization };
