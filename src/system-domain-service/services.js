function createSystemServicesService({ db, relationalServices, persistAppStateOnly, getStoredAppState }) {
  function createServiceRecord(payload, actor) {
    const service = (payload || {}).service || {};
    const name = String(service.name || '').trim();
    const amount = Number(service.amount || 0);
    const notes = String(service.notes || '').trim();
    const serviceDate = service.date || new Date().toISOString();
    if (!name || !(amount > 0)) {
      const err = new Error('Invalid service payload');
      err.statusCode = 400;
      throw err;
    }
    db.prepare(`
      INSERT INTO services (name, amount, notes, service_date, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, amount, notes, serviceDate, actor.id);
    persistAppStateOnly(getStoredAppState());
    return { ok: true, services: relationalServices() || [] };
  }

  function updateServiceRecord(serviceId, payload) {
    const numericId = Number(serviceId);
    const existing = db.prepare('SELECT id FROM services WHERE id = ? AND is_active = 1').get(numericId);
    if (!existing) {
      const err = new Error('Service not found');
      err.statusCode = 404;
      throw err;
    }
    const service = (payload || {}).service || {};
    const name = String(service.name || '').trim();
    const amount = Number(service.amount || 0);
    const notes = String(service.notes || '').trim();
    const serviceDate = service.date || new Date().toISOString();
    if (!name || !(amount > 0)) {
      const err = new Error('Invalid service payload');
      err.statusCode = 400;
      throw err;
    }
    db.prepare(`
      UPDATE services
      SET name = ?, amount = ?, notes = ?, service_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, amount, notes, serviceDate, numericId);
    persistAppStateOnly(getStoredAppState());
    return { ok: true, services: relationalServices() || [] };
  }

  function deleteServiceRecord(serviceId) {
    const numericId = Number(serviceId);
    const updated = db.prepare('UPDATE services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1').run(numericId);
    if (!updated.changes) {
      const err = new Error('Service not found');
      err.statusCode = 404;
      throw err;
    }
    persistAppStateOnly(getStoredAppState());
    return { ok: true, services: relationalServices() || [] };
  }

  return {
    createServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
  };
}

module.exports = { createSystemServicesService };
