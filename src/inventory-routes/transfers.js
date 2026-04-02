const { badRequest, created, fail, forbidden } = require('../http/respond');
const {
  buildStockTransfersListResponse,
  buildStockMovementsListResponse,
} = require('../inventory-query-service');

function registerInventoryTransferRoutes(deps) {
  const {
    app, db, authMiddleware, requirePermission, userHasPermission,
    relationalStockTransfers, relationalStockMovements, addAuditLog, helpers,
  } = deps;

  app.get('/api/stock-transfers', authMiddleware, (req, res) => {
    if (!(userHasPermission(req.user, 'inventory') || userHasPermission(req.user, 'canAdjustInventory'))) {
      return forbidden(res);
    }
    if (helpers.singleStoreTransfersDisabled()) return res.json(buildStockTransfersListResponse([], req.query || {}));
    const rows = helpers.filterRowsByBranchScope(relationalStockTransfers(), req.user, ['fromBranchId', 'toBranchId']);
    res.json(buildStockTransfersListResponse(rows, req.query || {}));
  });

  app.get('/api/stock-movements', authMiddleware, (req, res) => {
    if (!(userHasPermission(req.user, 'inventory') || userHasPermission(req.user, 'canAdjustInventory'))) {
      return forbidden(res);
    }
    const rows = helpers.filterRowsByBranchScope(relationalStockMovements(), req.user);
    res.json(buildStockMovementsListResponse(rows, req.query || {}));
  });

  app.post('/api/stock-transfers', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    if (helpers.singleStoreTransfersDisabled()) return helpers.rejectTransfersWhenSingleStore(res);
    const payload = req.body || {};
    const fromLocationId = Number(payload.fromLocationId || 0);
    const toLocationId = Number(payload.toLocationId || 0);
    const note = String(payload.note || '').trim();
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    if (!(fromLocationId > 0) || !(toLocationId > 0)) return badRequest(res, 'Both locations are required');
    if (fromLocationId === toLocationId) return badRequest(res, 'Source and destination locations must be different');

    let fromLocation;
    let toLocation;
    try {
      fromLocation = helpers.getLocationScope(fromLocationId, req.user, 'Source location is outside your assigned scope');
      toLocation = helpers.getLocationScope(toLocationId, req.user, 'Destination location is outside your assigned scope');
    } catch (err) {
      return fail(res, err, 'Location validation failed', /not found/i.test(err.message || '') ? 404 : 400);
    }

    const items = rawItems.map((item) => ({ productId: Number((item && item.productId) || 0), qty: Number((item && item.qty) || 0) })).filter((item) => item.productId > 0 && item.qty > 0);
    if (!items.length) return badRequest(res, 'At least one transfer item is required');

    try {
      const tx = db.transaction(() => {
        const result = db.prepare("INSERT INTO stock_transfers (doc_no, from_location_id, to_location_id, from_branch_id, to_branch_id, status, note, created_by) VALUES (?, ?, ?, ?, ?, 'sent', ?, ?)")
          .run(null, fromLocationId, toLocationId, fromLocation.branchId || null, toLocation.branchId || null, note, req.user.id);
        const transferId = Number(result.lastInsertRowid);
        const docNo = `TR-${transferId}`;
        db.prepare('UPDATE stock_transfers SET doc_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(docNo, transferId);
        const insertItem = db.prepare('INSERT INTO stock_transfer_items (transfer_id, product_id, product_name, qty) VALUES (?, ?, ?, ?)');
        for (const item of items) {
          const product = db.prepare('SELECT id, name, stock_qty FROM products WHERE id = ? AND is_active = 1').get(item.productId);
          if (!product) throw new Error(`Product #${item.productId} not found`);
          if (Number(product.stock_qty || 0) < item.qty) throw new Error(`Insufficient stock for ${product.name}`);
          insertItem.run(transferId, item.productId, product.name || '', item.qty);
        }
        addAuditLog('إنشاء تحويل مخزون', `تم إنشاء تحويل ${docNo} من ${fromLocation.name} إلى ${toLocation.name}`, req.user.id);
        return transferId;
      });
      const transferId = tx();
      created(res, { ok: true, transferId: String(transferId), stockTransfers: relationalStockTransfers() });
    } catch (err) {
      console.error(err);
      fail(res, err, 'Failed to create stock transfer');
    }
  });

  app.post('/api/stock-transfers/:id/receive', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    if (helpers.singleStoreTransfersDisabled()) return helpers.rejectTransfersWhenSingleStore(res);
    const transferId = Number(req.params.id || 0);
    if (!(transferId > 0)) return badRequest(res, 'Invalid transfer id');
    try {
      const tx = db.transaction(() => {
        const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        helpers.ensureBranchAccess(req.user, Number(transfer.from_branch_id || transfer.to_branch_id || 0), 'Transfer is outside your assigned scope');
        helpers.ensureBranchAccess(req.user, Number(transfer.to_branch_id || transfer.from_branch_id || 0), 'Transfer is outside your assigned scope');
        if ((transfer.status || 'sent') !== 'sent') throw new Error('Only sent transfers can be received');
        const items = db.prepare('SELECT product_id, qty FROM stock_transfer_items WHERE transfer_id = ?').all(transferId);
        for (const item of items) {
          const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(Number(item.product_id || 0));
          if (!product) throw new Error(`Product #${item.product_id} not found`);
          const qty = Number(item.qty || 0);
          if (!(qty > 0)) continue;
          const beforeQty = Number(product.stock_qty || 0);
          const afterQty = beforeQty;
          db.prepare('INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by, branch_id, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(product.id, 'transfer_receive', qty, beforeQty, afterQty, 'transfer_receive', `Received transfer TR-${transferId}`, 'transfer', transferId, req.user.id, Number(transfer.to_branch_id || 0) || null, Number(transfer.to_location_id || 0) || null);
        }
        db.prepare("UPDATE stock_transfers SET status = 'received', received_by = ?, received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, transferId);
        addAuditLog('استلام تحويل مخزون', `تم استلام التحويل TR-${transferId}`, req.user.id);
      });
      tx();
      res.json({ ok: true, stockTransfers: relationalStockTransfers() });
    } catch (err) {
      console.error(err);
      fail(res, err, 'Failed to receive stock transfer');
    }
  });

  app.post('/api/stock-transfers/:id/cancel', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    if (helpers.singleStoreTransfersDisabled()) return helpers.rejectTransfersWhenSingleStore(res);
    const transferId = Number(req.params.id || 0);
    if (!(transferId > 0)) return badRequest(res, 'Invalid transfer id');
    try {
      const tx = db.transaction(() => {
        const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        helpers.ensureBranchAccess(req.user, Number(transfer.from_branch_id || transfer.to_branch_id || 0), 'Transfer is outside your assigned scope');
        helpers.ensureBranchAccess(req.user, Number(transfer.to_branch_id || transfer.from_branch_id || 0), 'Transfer is outside your assigned scope');
        if ((transfer.status || 'sent') !== 'sent') throw new Error('Only sent transfers can be cancelled');
        db.prepare("UPDATE stock_transfers SET status = 'cancelled', cancelled_by = ?, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, transferId);
        addAuditLog('إلغاء تحويل مخزون', `تم إلغاء التحويل TR-${transferId}`, req.user.id);
      });
      tx();
      res.json({ ok: true, stockTransfers: relationalStockTransfers() });
    } catch (err) {
      console.error(err);
      fail(res, err, 'Failed to cancel stock transfer');
    }
  });
}

module.exports = { registerInventoryTransferRoutes };
