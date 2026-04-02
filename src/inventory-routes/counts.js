const { badRequest, created, fail } = require('../http/respond');
const {
  buildStockCountSessionsListResponse,
  buildDamagedStockListResponse,
} = require('../inventory-query-service');

function registerInventoryCountRoutes(deps) {
  const {
    app, db, authMiddleware, requirePermission, assertManagerPin, normalizeInventoryAdjustment,
    relationalStockCountSessions, relationalDamagedStockRecords, relationalProducts,
    relationalStockMovements, persistRelationalState, helpers,
  } = deps;

  app.get('/api/stock-count-sessions', authMiddleware, requirePermission('inventory'), (req, res) => {
    const rows = helpers.filterRowsByBranchScope(relationalStockCountSessions(), req.user);
    const response = buildStockCountSessionsListResponse(rows, req.query || {});
    if (!('page' in (req.query || {})) && !('pageSize' in (req.query || {})) && !req.query.search && !req.query.filter && !req.query.view) {
      return res.json({ stockCountSessions: rows, damagedStockRecords: helpers.filterRowsByBranchScope(relationalDamagedStockRecords(), req.user) });
    }
    res.json(response);
  });

  app.get('/api/damaged-stock', authMiddleware, requirePermission('inventory'), (req, res) => {
    const rows = helpers.filterRowsByBranchScope(relationalDamagedStockRecords(), req.user);
    res.json(buildDamagedStockListResponse(rows, req.query || {}));
  });

  app.post('/api/stock-count-sessions', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    try {
      assertManagerPin((req.body || {}).managerPin);
      const locationId = Number((req.body || {}).locationId || 0);
      let branchId = Number((req.body || {}).branchId || 0) || null;
      const note = String((req.body || {}).note || '').trim();
      const items = Array.isArray((req.body || {}).items) ? (req.body || {}).items : [];
      if (!locationId) return badRequest(res, 'Location is required');
      if (!items.length) return badRequest(res, 'At least one counted item is required');
      const locationScope = helpers.getLocationScope(locationId, req.user, 'Location is outside your assigned scope');
      if (branchId && branchId !== locationScope.branchId) return badRequest(res, 'Location does not belong to the selected branch');
      branchId = locationScope.branchId;
      const tx = db.transaction(() => {
        const sessionInfo = db.prepare('INSERT INTO stock_count_sessions (doc_no, branch_id, location_id, status, note, counted_by) VALUES (?, ?, ?, ?, ?, ?)')
          .run(`COUNT-${Date.now()}`, branchId, locationId, 'draft', note, req.user.id);
        const sessionId = Number(sessionInfo.lastInsertRowid);
        const getProduct = db.prepare('SELECT id, name, stock_qty FROM products WHERE id = ? AND is_active = 1');
        const insertItem = db.prepare('INSERT INTO stock_count_items (session_id, product_id, product_name, expected_qty, counted_qty, variance_qty, reason, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const rawItem of items) {
          const productId = Number((rawItem && rawItem.productId) || 0);
          const countedQty = Number((rawItem && rawItem.countedQty) || 0);
          if (!productId || !Number.isFinite(countedQty) || countedQty < 0) throw new Error('Invalid counted item');
          const product = getProduct.get(productId);
          if (!product) throw new Error('Product not found in stock count session');
          const expectedQty = Number(product.stock_qty || 0);
          const varianceQty = Number((countedQty - expectedQty).toFixed(3));
          insertItem.run(sessionId, productId, product.name || '', expectedQty, countedQty, varianceQty, String(rawItem.reason || ''), String(rawItem.note || ''));
        }
        helpers.writeStructuredAudit('جلسة جرد مخزون', req.user, { before: null, after: { sessionId, branchId, locationId, note, itemsCount: items.length, status: 'draft' } });
        persistRelationalState();
        return sessionId;
      });
      const sessionId = tx();
      created(res, { ok: true, sessionId: String(sessionId), stockCountSessions: relationalStockCountSessions(), damagedStockRecords: relationalDamagedStockRecords() });
    } catch (err) {
      fail(res, err, 'Could not create stock count session');
    }
  });

  app.post('/api/stock-count-sessions/:id/post', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    try {
      assertManagerPin((req.body || {}).managerPin);
      const sessionId = Number(req.params.id);
      const tx = db.transaction(() => {
        const session = db.prepare('SELECT * FROM stock_count_sessions WHERE id = ?').get(sessionId);
        if (!session) throw new Error('Stock count session not found');
        helpers.ensureBranchAccess(req.user, Number(session.branch_id || 0), 'Stock count session is outside your assigned scope');
        if ((session.status || 'draft') !== 'draft') throw new Error('Stock count session already posted');
        const items = db.prepare('SELECT * FROM stock_count_items WHERE session_id = ? ORDER BY id ASC').all(sessionId);
        if (!items.length) throw new Error('Stock count session has no items');
        const updateProduct = db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const insertMovement = db.prepare(`INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'stock_count_session', ?, ?)`);
        const insertDamaged = db.prepare('INSERT INTO damaged_stock_records (product_id, branch_id, location_id, qty, reason, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const item of items) {
          const beforeQty = Number(item.expected_qty || 0);
          const countedQty = Number(item.counted_qty || 0);
          const varianceQty = Number(item.variance_qty || 0);
          if (varianceQty === 0) continue;
          updateProduct.run(countedQty, countedQty, item.product_id);
          insertMovement.run(item.product_id, varianceQty > 0 ? 'stock_count_gain' : 'stock_count_loss', varianceQty, beforeQty, countedQty, item.reason || 'inventory_count', item.note || '', sessionId, req.user.id);
          if ((item.reason || '').toLowerCase() === 'damage' && Math.abs(varianceQty) > 0) {
            insertDamaged.run(item.product_id, session.branch_id || null, session.location_id || null, Math.abs(Math.min(varianceQty, 0)) || Math.abs(varianceQty), 'damage', item.note || 'جلسة جرد', req.user.id);
          }
        }
        db.prepare("UPDATE stock_count_sessions SET status = 'posted', approved_by = ?, posted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, sessionId);
        helpers.writeStructuredAudit('اعتماد جلسة جرد', req.user, { before: { sessionId, status: 'draft' }, after: { sessionId, status: 'posted', itemsCount: items.length } });
        persistRelationalState();
      });
      tx();
      res.json({ ok: true, stockCountSessions: relationalStockCountSessions(), products: relationalProducts(), stockMovements: relationalStockMovements(), damagedStockRecords: relationalDamagedStockRecords() });
    } catch (err) {
      fail(res, err, 'Could not post stock count session');
    }
  });

  app.post('/api/damaged-stock', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    try {
      const payload = normalizeInventoryAdjustment(req.body || {});
      if (!payload.productId) return badRequest(res, 'Product is required');
      const scope = helpers.getLocationScope(payload.locationId, req.user, 'Damage record location is outside your assigned scope');
      if (payload.branchId && Number(payload.branchId) !== Number(scope.branchId || 0)) {
        return badRequest(res, 'Location does not belong to the selected branch');
      }
      payload.branchId = scope.branchId;
      payload.locationId = scope.id;
      if (!Number.isFinite(payload.qty) || payload.qty <= 0) return badRequest(res, 'Quantity must be greater than zero');
      if (String(payload.note || '').trim().length < 8) return badRequest(res, 'اكتب سبب التالف بوضوح في 8 أحرف على الأقل');
      assertManagerPin(payload.managerPin);
      const tx = db.transaction(() => {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(payload.productId);
        if (!product) throw new Error('Product not found');
        const beforeQty = Number(product.stock_qty || 0);
        const afterQty = beforeQty - Number(payload.qty || 0);
        if (afterQty < 0) throw new Error('Cannot mark more damaged stock than current stock');
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, payload.productId);
        db.prepare("INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by) VALUES (?, 'damaged', ?, ?, ?, ?, ?, 'damaged_stock', ?, ?)")
          .run(payload.productId, -Number(payload.qty || 0), beforeQty, afterQty, payload.reason || 'damage', payload.note || '', payload.productId, req.user.id);
        db.prepare('INSERT INTO damaged_stock_records (product_id, branch_id, location_id, qty, reason, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(payload.productId, Number(payload.branchId || 0) || null, Number(payload.locationId || 0) || null, Number(payload.qty || 0), payload.reason || 'damage', payload.note || '', req.user.id);
        helpers.writeStructuredAudit('تسجيل تالف', req.user, { before: { productId: payload.productId, stockQty: beforeQty }, reason: String(payload.note || '').trim(), after: { productId: payload.productId, damagedQty: Number(payload.qty || 0), stockQty: afterQty, branchId: Number(payload.branchId || 0) || null, locationId: Number(payload.locationId || 0) || null } });
        persistRelationalState();
      });
      tx();
      created(res, { ok: true, products: relationalProducts(), damagedStockRecords: relationalDamagedStockRecords(), stockMovements: relationalStockMovements() });
    } catch (err) {
      fail(res, err, 'Could not record damaged stock');
    }
  });
}

module.exports = { registerInventoryCountRoutes };
