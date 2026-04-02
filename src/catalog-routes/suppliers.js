const { badRequest, created, fail, notFound, ok } = require('../http/respond');
const { parsePageParams, paginateRows, includesSearch } = require('./shared');

function registerSupplierRoutes(deps) {
  const {
    app, authMiddleware, requirePermission, normalizeSupplier, relationalSuppliers,
    persistRelationalState, db, helpers,
  } = deps;

  app.get('/api/suppliers', authMiddleware, (req, res) => {
    const suppliers = relationalSuppliers() || [];
    const { page, pageSize } = parsePageParams(req.query);
    const q = String(req.query.q || '').trim().toLowerCase();
    const filter = String(req.query.filter || 'all');
    if (!('page' in req.query) && !('pageSize' in req.query) && !q && filter === 'all') return res.json({ suppliers });
    const filtered = suppliers.filter((supplier) => {
      if (filter === 'debt' && Number(supplier.balance || 0) <= 0) return false;
      if (filter === 'withNotes' && !supplier.notes) return false;
      return includesSearch([supplier.name, supplier.phone, supplier.address, supplier.notes], q);
    });
    const summary = {
      totalSuppliers: filtered.length,
      totalBalance: filtered.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0),
      withNotes: filtered.filter((supplier) => Boolean(supplier.notes)).length,
    };
    const paged = paginateRows(filtered, page, pageSize);
    res.json({ suppliers: paged.rows, pagination: paged.pagination, summary });
  });

  app.post('/api/suppliers', authMiddleware, requirePermission('suppliers'), (req, res) => {
    try {
      const payload = normalizeSupplier(req.body || {});
      if (!payload.name) return badRequest(res, 'Supplier name is required');
      const duplicate = db.prepare('SELECT id FROM suppliers WHERE lower(name) = lower(?) AND is_active = 1').get(payload.name);
      if (duplicate) return badRequest(res, 'Supplier already exists');
      db.prepare('INSERT INTO suppliers (name, phone, address, balance, notes, is_active) VALUES (?, ?, ?, ?, ?, 1)')
        .run(payload.name, payload.phone, payload.address, payload.balance, payload.notes);
      persistRelationalState();
      created(res, { ok: true, suppliers: relationalSuppliers() });
    } catch (err) {
      fail(res, err, 'Could not create supplier');
    }
  });

  app.put('/api/suppliers/:id', authMiddleware, requirePermission('suppliers'), (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      const payload = normalizeSupplier(req.body || {});
      if (!payload.name) return badRequest(res, 'Supplier name is required');
      const existing = db.prepare('SELECT id FROM suppliers WHERE id = ? AND is_active = 1').get(supplierId);
      if (!existing) return notFound(res, 'Supplier not found');
      const duplicate = db.prepare('SELECT id FROM suppliers WHERE lower(name) = lower(?) AND id != ? AND is_active = 1').get(payload.name, supplierId);
      if (duplicate) return badRequest(res, 'Supplier already exists');
      db.prepare('UPDATE suppliers SET name = ?, phone = ?, address = ?, balance = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(payload.name, payload.phone, payload.address, payload.balance, payload.notes, supplierId);
      persistRelationalState();
      ok(res, { ok: true, suppliers: relationalSuppliers() });
    } catch (err) {
      fail(res, err, 'Could not update supplier');
    }
  });

  app.delete('/api/suppliers/:id', authMiddleware, requirePermission('canDelete'), (req, res) => {
    try {
      const supplierId = Number(req.params.id);
      helpers.assertSupplierDeletionAllowed(supplierId);
      const inUse = db.prepare('SELECT COUNT(*) AS count FROM products WHERE supplier_id = ? AND is_active = 1').get(supplierId);
      if (Number(inUse.count || 0) > 0) return badRequest(res, 'Supplier is used by products');
      db.prepare('UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(supplierId);
      persistRelationalState();
      ok(res, { ok: true, suppliers: relationalSuppliers() });
    } catch (err) {
      fail(res, err, 'Could not delete supplier');
    }
  });
}

module.exports = { registerSupplierRoutes };
