const {
  BRANCH_USAGE_CHECKS,
  LOCATION_USAGE_CHECKS,
  assertEntityUnused,
  createStatusError,
  normalizeEntityCode,
  normalizeEntityName,
} = require('./branches-locations.helpers');

function createBranchLocationService({
  db,
  addAuditLog,
  getSystemSettings,
  relationalBranches,
  relationalLocations,
  singleStoreMode,
}) {
  function assertSingleStoreBranchCapacity() {
    if (!singleStoreMode) return;
    const activeBranchCount = Number(db.prepare('SELECT COUNT(*) AS total FROM branches WHERE is_active = 1').get()?.total || 0);
    if (activeBranchCount >= 1) {
      throw createStatusError('الإصدار الحالي يدعم فرعًا رئيسيًا واحدًا فقط', 400);
    }
  }

  function assertSingleStoreLocationCapacity() {
    if (!singleStoreMode) return;
    const activeLocationCount = Number(db.prepare('SELECT COUNT(*) AS total FROM stock_locations WHERE is_active = 1').get()?.total || 0);
    if (activeLocationCount >= 1) {
      throw createStatusError('الإصدار الحالي يدعم مخزنًا أساسيًا واحدًا فقط', 400);
    }
  }

  function createBranchRecord(payload, actor) {
    const name = normalizeEntityName(payload, 'name', 'Branch');
    const code = normalizeEntityCode(payload);
    assertSingleStoreBranchCapacity();
    const duplicate = code ? db.prepare('SELECT id FROM branches WHERE lower(code) = lower(?) AND is_active = 1 LIMIT 1').get(code) : db.prepare('SELECT id FROM branches WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(name);
    if (duplicate) {
      throw createStatusError('الفرع موجود بالفعل', 400);
    }
    const result = db.prepare('INSERT INTO branches (name, code, is_active) VALUES (?, ?, 1)').run(name, code);
    const branchId = String(result.lastInsertRowid);
    addAuditLog('إضافة فرع', `تم إضافة الفرع ${name} بواسطة ${actor.username}`, actor.id);
    return { ok: true, branchId, branches: relationalBranches() };
  }

  function resolveActiveBranchId(branchIdRaw) {
    const normalized = String(branchIdRaw || '').trim();
    if (!normalized) return null;
    const branch = db.prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1').get(Number(normalized));
    if (!branch) {
      throw createStatusError('Selected branch does not exist', 400);
    }
    return Number(branch.id);
  }

  function ensureUniqueBranch(name, code, excludeId = null) {
    const duplicate = code
      ? db.prepare('SELECT id FROM branches WHERE lower(code) = lower(?) AND is_active = 1 AND (? IS NULL OR id <> ?) LIMIT 1').get(code, excludeId, excludeId)
      : db.prepare('SELECT id FROM branches WHERE lower(name) = lower(?) AND is_active = 1 AND (? IS NULL OR id <> ?) LIMIT 1').get(name, excludeId, excludeId);
    if (duplicate) {
      throw createStatusError('الفرع موجود بالفعل', 400);
    }
  }

  function ensureUniqueLocation(name, code, branchId, excludeId = null) {
    const duplicate = code
      ? db.prepare('SELECT id FROM stock_locations WHERE lower(code) = lower(?) AND is_active = 1 AND (? IS NULL OR id <> ?) LIMIT 1').get(code, excludeId, excludeId)
      : db.prepare('SELECT id FROM stock_locations WHERE lower(name) = lower(?) AND COALESCE(branch_id, 0) = COALESCE(?, 0) AND is_active = 1 AND (? IS NULL OR id <> ?) LIMIT 1').get(name, branchId, excludeId, excludeId);
    if (duplicate) {
      throw createStatusError('الموقع موجود بالفعل', 400);
    }
  }

  function createLocationRecord(payload, actor) {
    const name = normalizeEntityName(payload, 'name', 'Location');
    const code = normalizeEntityCode(payload);
    assertSingleStoreLocationCapacity();
    const branchId = resolveActiveBranchId((payload || {}).branchId);
    ensureUniqueLocation(name, code, branchId);
    const result = db.prepare('INSERT INTO stock_locations (branch_id, name, code, is_active) VALUES (?, ?, ?, 1)').run(branchId, name, code);
    const locationId = String(result.lastInsertRowid);
    addAuditLog('إضافة موقع مخزون', `تم إضافة موقع ${name} بواسطة ${actor.username}`, actor.id);
    return { ok: true, locationId, locations: relationalLocations() };
  }

  function updateBranchRecord(branchId, payload, actor) {
    const numericId = Number(branchId);
    const existing = db.prepare('SELECT id, name, code FROM branches WHERE id = ? AND is_active = 1').get(numericId);
    if (!existing) {
      throw createStatusError('Branch not found', 404);
    }
    const name = normalizeEntityName(payload, 'name', 'Branch');
    const code = normalizeEntityCode(payload);
    ensureUniqueBranch(name, code, numericId);
    db.prepare('UPDATE branches SET name = ?, code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, code, numericId);
    addAuditLog('تعديل فرع', `تم تحديث الفرع ${existing.name} بواسطة ${actor.username}`, actor.id);
    return { ok: true, branchId: String(numericId), branches: relationalBranches() };
  }

  function deleteBranchRecord(branchId, actor) {
    const numericId = Number(branchId);
    const existing = db.prepare('SELECT id, name FROM branches WHERE id = ? AND is_active = 1').get(numericId);
    if (!existing) {
      throw createStatusError('Branch not found', 404);
    }
    const activeLocations = db.prepare('SELECT COUNT(1) AS count FROM stock_locations WHERE branch_id = ? AND is_active = 1').get(numericId).count || 0;
    if (activeLocations) {
      throw createStatusError('لا يمكن حذف الفرع طالما توجد مواقع نشطة مرتبطة به', 400);
    }
    const settings = getSystemSettings() || {};
    if (String(settings.currentBranchId || '') == String(numericId)) {
      throw createStatusError('لا يمكن حذف الفرع المحدد حاليًا في الإعدادات', 400);
    }
    const linkedUsers = db.prepare("SELECT COUNT(1) AS count FROM users WHERE is_active = 1 AND (default_branch_id = ? OR branch_ids_json LIKE ?)").get(numericId, `%%\"${numericId}\"%%`).count || 0;
    if (linkedUsers) {
      throw createStatusError('لا يمكن حذف الفرع لوجود مستخدمين مرتبطين به', 400);
    }
    assertEntityUnused(db, numericId, BRANCH_USAGE_CHECKS, 'لا يمكن حذف الفرع بعد استخدامه في حركات تشغيلية');
    db.prepare('UPDATE branches SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(numericId);
    addAuditLog('حذف فرع', `تم تعطيل الفرع ${existing.name} بواسطة ${actor.username}`, actor.id);
    return { ok: true, removedBranchId: String(numericId), branches: relationalBranches() };
  }

  function updateLocationRecord(locationId, payload, actor) {
    const numericId = Number(locationId);
    const existing = db.prepare('SELECT id, name FROM stock_locations WHERE id = ? AND is_active = 1').get(numericId);
    if (!existing) {
      throw createStatusError('Location not found', 404);
    }
    const name = normalizeEntityName(payload, 'name', 'Location');
    const code = normalizeEntityCode(payload);
    const branchId = resolveActiveBranchId((payload || {}).branchId);
    ensureUniqueLocation(name, code, branchId, numericId);
    db.prepare('UPDATE stock_locations SET branch_id = ?, name = ?, code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(branchId, name, code, numericId);
    addAuditLog('تعديل موقع مخزون', `تم تحديث موقع ${existing.name} بواسطة ${actor.username}`, actor.id);
    return { ok: true, locationId: String(numericId), locations: relationalLocations() };
  }

  function deleteLocationRecord(locationId, actor) {
    const numericId = Number(locationId);
    const existing = db.prepare('SELECT id, name FROM stock_locations WHERE id = ? AND is_active = 1').get(numericId);
    if (!existing) {
      throw createStatusError('Location not found', 404);
    }
    const settings = getSystemSettings() || {};
    if (String(settings.currentLocationId || '') == String(numericId)) {
      throw createStatusError('لا يمكن حذف الموقع المحدد حاليًا في الإعدادات', 400);
    }
    assertEntityUnused(db, numericId, LOCATION_USAGE_CHECKS, 'لا يمكن حذف الموقع بعد استخدامه في حركات تشغيلية');
    db.prepare('UPDATE stock_locations SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(numericId);
    addAuditLog('حذف موقع مخزون', `تم تعطيل موقع ${existing.name} بواسطة ${actor.username}`, actor.id);
    return { ok: true, removedLocationId: String(numericId), locations: relationalLocations() };
  }

  return {
    assertSingleStoreBranchCapacity,
    assertSingleStoreLocationCapacity,
    createBranchRecord,
    resolveActiveBranchId,
    ensureUniqueBranch,
    ensureUniqueLocation,
    createLocationRecord,
    updateBranchRecord,
    deleteBranchRecord,
    updateLocationRecord,
    deleteLocationRecord,
  };
}

module.exports = { createBranchLocationService };
