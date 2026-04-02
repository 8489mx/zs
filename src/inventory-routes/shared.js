function createInventoryRouteHelpers({ db, addAuditLog, config }) {
  function getAllowedBranchIds(user) {
    if (!user || user.role === 'super_admin') return [];
    const rawBranchIds = Array.isArray(user.branchIds) ? user.branchIds : [];
    const normalized = rawBranchIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
    const defaultBranchId = Number(user.defaultBranchId || 0);
    if (Number.isInteger(defaultBranchId) && defaultBranchId > 0 && !normalized.includes(defaultBranchId)) normalized.push(defaultBranchId);
    return Array.from(new Set(normalized));
  }

  function ensureBranchAccess(user, branchId, message = 'Selected branch is outside your assigned scope') {
    const allowedBranchIds = getAllowedBranchIds(user);
    if (!allowedBranchIds.length || !(branchId > 0)) return Number(branchId || 0) || null;
    if (!allowedBranchIds.includes(Number(branchId))) throw new Error(message);
    return Number(branchId);
  }

  function getLocationScope(locationId, user, message = 'Selected location is outside your assigned scope') {
    const normalizedLocationId = Number(locationId || 0);
    if (!(normalizedLocationId > 0)) throw new Error('Location is required');
    const location = db.prepare('SELECT id, name, branch_id FROM stock_locations WHERE id = ? AND is_active = 1').get(normalizedLocationId);
    if (!location) throw new Error('Location not found');
    ensureBranchAccess(user, Number(location.branch_id || 0), message);
    return { id: Number(location.id), name: location.name || '', branchId: Number(location.branch_id || 0) || null };
  }

  function filterRowsByBranchScope(rows, user, branchKeys = ['branchId']) {
    const allowedBranchIds = getAllowedBranchIds(user);
    if (!allowedBranchIds.length) return rows;
    return rows.filter((row) => {
      const resolvedBranchIds = branchKeys.map((key) => Number(row && row[key] || 0)).filter((value) => Number.isInteger(value) && value > 0);
      if (!resolvedBranchIds.length) return true;
      return resolvedBranchIds.some((value) => allowedBranchIds.includes(value));
    });
  }

  function safeAuditPayload(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function writeStructuredAudit(action, user, meta) {
    addAuditLog(action, JSON.stringify(safeAuditPayload({
      actorUserId: Number(user && user.id || 0),
      actorRole: String(user && user.role || ''),
      ...meta,
    }, meta || {})), user && user.id ? Number(user.id) : null);
  }

  function singleStoreTransfersDisabled() {
    return Boolean(config && config.singleStoreMode);
  }

  function rejectTransfersWhenSingleStore(res) {
    return res.status(409).json({ error: 'Stock transfers are unavailable in the current single-store edition.' });
  }

  return {
    getAllowedBranchIds,
    ensureBranchAccess,
    getLocationScope,
    filterRowsByBranchScope,
    writeStructuredAudit,
    singleStoreTransfersDisabled,
    rejectTransfersWhenSingleStore,
  };
}

module.exports = { createInventoryRouteHelpers };
