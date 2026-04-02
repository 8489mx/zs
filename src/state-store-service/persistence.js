function createStateStorePersistence({
  db,
  core,
}) {
  const {
    mergeStateWithDefaults,
    sanitizeLegacyState,
    getStoredAppState,
    hydrateRelationalCollections,
    stateWithUsers,
  } = core;

  function upsertSetting(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, String(value ?? ''));
  }

  function persistAppStateOnly(state) {
    const stateToStore = sanitizeLegacyState(state || {});
    db.prepare(`
      INSERT INTO app_state (id, state_json, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(stateToStore));
    return stateToStore;
  }

  function persistRelationalState() {
    return persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
  }

  function saveState(nextState) {
    const safe = mergeStateWithDefaults(nextState || {});
    const tx = db.transaction(() => {
      upsertSetting('storeName', safe.settings.storeName || 'Z Systems');
      upsertSetting('storePhone', safe.settings.phone || '');
      upsertSetting('storeAddress', safe.settings.address || '');
      upsertSetting('lowStockThreshold', safe.settings.lowStockThreshold || 5);
      upsertSetting('invoiceFooter', safe.settings.invoiceFooter || '');
      upsertSetting('invoiceQR', safe.settings.invoiceQR || '');
      upsertSetting('taxNumber', safe.settings.taxNumber || '');
      upsertSetting('taxRate', String(Number(safe.settings.taxRate || 0)));
      upsertSetting('taxMode', safe.settings.taxMode === 'inclusive' ? 'inclusive' : 'exclusive');
      upsertSetting('logoData', safe.settings.logoData || '');
      upsertSetting('paperSize', safe.settings.paperSize || 'a4');
      if (Object.prototype.hasOwnProperty.call(safe.settings || {}, 'managerPin')) {
        upsertSetting('managerPinHash', safe.settings.managerPin || '');
        upsertSetting('managerPin', '');
      }
      upsertSetting('autoBackup', safe.settings.autoBackup || 'on');
      upsertSetting('brandName', safe.settings.brandName || 'Z Systems');
      upsertSetting('accentColor', safe.settings.accentColor || '#2563eb');
      upsertSetting('currentBranchId', safe.settings.currentBranchId || '');
      upsertSetting('currentLocationId', safe.settings.currentLocationId || '');

      // NOTE: syncUsers is intentionally NOT called here.
      // Users and permissions are managed exclusively via the dedicated
      // user-management API endpoints (PUT /api/users).
      // Calling syncUsers from every state save was overwriting permissions
      // with stale frontend data, causing "Permission denied" errors app-wide.
      persistAppStateOnly(sanitizeLegacyState(safe));
    });

    tx();
    return stateWithUsers();
  }

  function makeDocNo(prefix, id) {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(id).padStart(6, '0')}`;
  }

  function addAuditLog(action, details, userId) {
    db.prepare('INSERT INTO audit_logs (action, details, created_by) VALUES (?, ?, ?)').run(action, details || '', userId || null);
  }

  function addSecurityAudit(action, details, userId) {
    addAuditLog(`أمن: ${action}`, details, userId);
  }

  function resolveBranchLocationScope(payload, actor = null) {
    const rawBranchId = payload && payload.branchId ? Number(payload.branchId) : null;
    const locationId = payload && payload.locationId ? Number(payload.locationId) : null;
    const allowedBranchIds = Array.isArray(actor && actor.branchIds)
      ? actor.branchIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      : [];
    const normalizedDefaultBranchId = actor && actor.defaultBranchId ? Number(actor.defaultBranchId) : null;
    let branchId = rawBranchId;

    if (!branchId && !locationId && allowedBranchIds.length && Number.isInteger(normalizedDefaultBranchId) && normalizedDefaultBranchId > 0) {
      branchId = normalizedDefaultBranchId;
    }

    if (branchId) {
      const branch = db.prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1').get(branchId);
      if (!branch) throw new Error('Branch not found');
      if (allowedBranchIds.length && !allowedBranchIds.includes(branchId)) {
        throw new Error('Branch is outside your assigned scope');
      }
    }
    if (locationId) {
      const location = db.prepare('SELECT id, branch_id FROM stock_locations WHERE id = ? AND is_active = 1').get(locationId);
      if (!location) throw new Error('Location not found');
      if (branchId && location.branch_id && Number(location.branch_id) !== branchId) throw new Error('Location does not belong to the selected branch');
      const resolvedBranchId = branchId || (location.branch_id ? Number(location.branch_id) : null);
      if (resolvedBranchId && allowedBranchIds.length && !allowedBranchIds.includes(resolvedBranchId)) {
        throw new Error('Location is outside your assigned branch scope');
      }
      return { branchId: resolvedBranchId, locationId };
    }
    return { branchId, locationId };
  }

  return {
    upsertSetting,
    persistAppStateOnly,
    persistRelationalState,
    saveState,
    makeDocNo,
    addAuditLog,
    addSecurityAudit,
    resolveBranchLocationScope,
  };
}

module.exports = { createStateStorePersistence };
