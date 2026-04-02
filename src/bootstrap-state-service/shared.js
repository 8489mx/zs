function createBootstrapShared({
  db,
  safeJsonParse,
  revokeSessionsForUser,
}) {
  function normalizeBranchScopeInput(branchIds = [], defaultBranchId = '') {
    const uniqueBranchIds = Array.from(new Set((Array.isArray(branchIds) ? branchIds : []).map((value) => String(value || '').trim()).filter(Boolean)));
    const normalizedDefaultBranchId = String(defaultBranchId || '').trim();
    const numericBranchIds = uniqueBranchIds.map((value) => Number(value));
    if (numericBranchIds.some((value) => !Number.isInteger(value) || value <= 0)) throw new Error('Invalid branch permission scope');
    if (normalizedDefaultBranchId) {
      const numericDefaultBranchId = Number(normalizedDefaultBranchId);
      if (!Number.isInteger(numericDefaultBranchId) || numericDefaultBranchId <= 0) throw new Error('Invalid default branch');
      if (!uniqueBranchIds.includes(String(numericDefaultBranchId))) uniqueBranchIds.push(String(numericDefaultBranchId));
    }
    if (uniqueBranchIds.length) {
      const placeholders = uniqueBranchIds.map(() => '?').join(',');
      const rows = db.prepare(`SELECT id FROM branches WHERE is_active = 1 AND id IN (${placeholders})`).all(...uniqueBranchIds.map((value) => Number(value)));
      const availableIds = new Set(rows.map((entry) => String(entry.id)));
      const missing = uniqueBranchIds.filter((value) => !availableIds.has(String(Number(value))));
      if (missing.length) throw new Error('User references missing or inactive branches');
    }
    return {
      branchIds: uniqueBranchIds.map((value) => String(Number(value))),
      defaultBranchId: normalizedDefaultBranchId ? String(Number(normalizedDefaultBranchId)) : '',
    };
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
      || String(existing.username || '').trim().toLowerCase() !== String(nextUser.username || '').trim().toLowerCase()
      || String(existing.role || '').trim() !== String(nextUser.role || '').trim()
      || Number(existing.is_active || 0) !== (nextUser.isActive ? 1 : 0)
      || Number(existing.must_change_password || 0) !== (nextUser.mustChangePassword ? 1 : 0)
      || String(existing.default_branch_id || '') !== String(nextUser.defaultBranchId || '')
      || currentPermissions !== nextPermissions
      || currentBranches !== nextBranches
    );
  }

  return {
    normalizeBranchScopeInput,
    revokeManagedUserSessions,
    hasManagedUserSecurityChange,
  };
}

module.exports = { createBootstrapShared };
