const { badRequest, created, fail, forbidden, notFound, ok, tooManyRequests } = require('../http/respond');
const { parsePageParams, paginateRows, includesSearch } = require('./shared');

function registerProductRoutes(deps) {
  const {
    app, authMiddleware, requirePermission, normalizeIncomingProduct, relationalProducts,
    relationalCategories, relationalSuppliers, relationalStockMovements, relationalAuditLogs,
    replaceProductRelations, persistRelationalState, db, userHasPermission,
    normalizeInventoryAdjustment, helpers,
  } = deps;

  const sanitizeProduct = (product) => {
    if (userHasPermission && !userHasPermission(product && product._viewer, 'canViewCost')) {
      const clone = { ...product };
      delete clone.cost;
      delete clone.costPrice;
      return clone;
    }
    return product;
  };

  app.get('/api/products', authMiddleware, (req, res) => {
    const products = relationalProducts() || [];
    const { page, pageSize } = parsePageParams(req.query);
    const q = String(req.query.q || '').trim().toLowerCase();
    const view = String(req.query.view || 'all');
    const canViewSensitivePricing = userHasPermission(req.user, 'canViewCost');
    const categories = Object.fromEntries((relationalCategories() || []).map((entry) => [String(entry.id), String(entry.name || '')]));
    const suppliers = Object.fromEntries((relationalSuppliers() || []).map((entry) => [String(entry.id), String(entry.name || '')]));
    if (!('page' in req.query) && !('pageSize' in req.query) && !q && view === 'all') {
      return res.json({ products: products.map((product) => sanitizeProduct({ ...product, _viewer: req.user })) });
    }
    const filtered = products.filter((product) => {
      if (view === 'low' && !(Number(product.stock || 0) <= Number(product.minStock || 0))) return false;
      if (view === 'out' && !(Number(product.stock || 0) <= 0)) return false;
      if (view === 'offers' && !((product.offers || []).length)) return false;
      if (view === 'special' && !((product.customerPrices || []).length)) return false;
      const unitValues = Array.isArray(product.units) ? product.units.flatMap((unit) => [unit.name, unit.barcode]) : [];
      return includesSearch([product.name, product.barcode, categories[product.categoryId] || '', suppliers[product.supplierId] || '', product.notes, ...unitValues], q);
    });
    const summary = {
      totalProducts: filtered.length,
      lowStockCount: filtered.filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0)).length,
      outOfStockCount: filtered.filter((product) => Number(product.stock || 0) <= 0).length,
      inventoryCost: canViewSensitivePricing
        ? filtered.reduce((sum, product) => sum + (Number(product.stock || 0) * Number(product.costPrice || 0)), 0)
        : null,
      inventorySaleValue: filtered.reduce((sum, product) => sum + (Number(product.stock || 0) * Number(product.retailPrice || 0)), 0),
      activeOffersCount: filtered.reduce((sum, product) => sum + Number((product.offers || []).length), 0),
      customerPriceCount: filtered.reduce((sum, product) => sum + Number((product.customerPrices || []).length), 0),
    };
    const paged = paginateRows(filtered.map((product) => sanitizeProduct({ ...product, _viewer: req.user })), page, pageSize);
    res.json({ products: paged.rows, pagination: paged.pagination, summary });
  });

  app.post('/api/products', authMiddleware, requirePermission('products'), (req, res) => {
    try {
      const payload = normalizeIncomingProduct(req.body || {});
      if (!payload.name) return badRequest(res, 'Product name is required');
      helpers.ensureActiveProductIdentityAvailable(payload);
      const tx = db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO products (name, barcode, category_id, supplier_id, price, cost, stock, cost_price, retail_price, wholesale_price, stock_qty, min_stock_qty, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(payload.name, payload.barcode || null, payload.categoryId, payload.supplierId, payload.retailPrice, payload.costPrice, payload.stock, payload.costPrice, payload.retailPrice, payload.wholesalePrice, payload.stock, payload.minStock, payload.notes);
        const productId = Number(info.lastInsertRowid);
        replaceProductRelations(productId, payload);
        if (payload.stock > 0) {
          db.prepare('INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(productId, 'opening', payload.stock, 0, payload.stock, 'opening_balance', 'Opening stock', 'product', productId, req.user.id);
        }
        persistRelationalState();
      });
      tx();
      created(res, { ok: true, products: relationalProducts() });
    } catch (err) {
      fail(res, err, 'Could not create product');
    }
  });

  app.put('/api/products/:id', authMiddleware, requirePermission('products'), (req, res) => {
    try {
      const productId = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
      if (!existing) return notFound(res, 'Product not found');
      const payload = normalizeIncomingProduct(req.body || {});
      if (!payload.name) return badRequest(res, 'Product name is required');
      helpers.ensureActiveProductIdentityAvailable(payload, productId);
      if (Object.prototype.hasOwnProperty.call(payload, 'stock')) {
        if (!userHasPermission(req.user, 'canAdjustInventory')) {
          return forbidden(res, 'Inventory adjustments require canAdjustInventory permission');
        }
        return badRequest(res, 'Stock cannot be edited from product master data. Use inventory adjustment.');
      }
      const priceChanged = Number(payload.costPrice || 0) !== Number(existing.cost_price || existing.cost || 0)
        || Number(payload.retailPrice || 0) !== Number(existing.retail_price || existing.price || 0)
        || Number(payload.wholesalePrice || 0) !== Number(existing.wholesale_price || 0);
      if (priceChanged && !userHasPermission(req.user, 'canEditPrice')) {
        return forbidden(res, 'Price changes require canEditPrice permission');
      }
      const tx = db.transaction(() => {
        db.prepare(`
          UPDATE products
          SET name = ?, barcode = ?, category_id = ?, supplier_id = ?, price = ?, cost = ?,
              cost_price = ?, retail_price = ?, wholesale_price = ?, min_stock_qty = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(payload.name, payload.barcode || null, payload.categoryId, payload.supplierId, payload.retailPrice, payload.costPrice, payload.costPrice, payload.retailPrice, payload.wholesalePrice, payload.minStock, payload.notes, productId);
        replaceProductRelations(productId, payload);
        persistRelationalState();
      });
      tx();
      ok(res, { ok: true, products: relationalProducts() });
    } catch (err) {
      fail(res, err, 'Could not update product');
    }
  });

  app.post('/api/inventory-adjustments', authMiddleware, requirePermission('canAdjustInventory'), (req, res) => {
    try {
      const rate = helpers.inventoryAdjustmentRateLimit(helpers.getRateLimitKey(req, 'inventory-adjustment', req.user?.id));
      if (!rate.allowed) {
        return tooManyRequests(res, 'Too many inventory adjustments. Try again later.');
      }
      const payload = normalizeInventoryAdjustment(req.body || {});
      if (!payload.productId) return badRequest(res, 'Product is required');
      if (!Number.isFinite(payload.qty) || payload.qty < 0) return badRequest(res, 'Quantity must be zero or greater');
      if (!payload.reason) return badRequest(res, 'Reason is required');
      helpers.assertManagerPin(payload.managerPin);
      const tx = db.transaction(() => {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(payload.productId);
        if (!product) throw new Error('Product not found');
        const beforeQty = Number(product.stock_qty || 0);
        let afterQty = beforeQty;
        let movementQty = Number(payload.qty || 0);
        if (payload.actionType === 'adjust') {
          afterQty = Number(payload.qty || 0);
          movementQty = Math.abs(afterQty - beforeQty);
        } else if (payload.actionType === 'add') {
          afterQty = beforeQty + Number(payload.qty || 0);
        } else {
          afterQty = beforeQty - Number(payload.qty || 0);
          if (afterQty < 0) throw new Error('Cannot deduct more than current stock');
        }
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, payload.productId);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'inventory_adjustment', ?, ?)
        `).run(payload.productId, payload.actionType, payload.actionType === 'deduct' ? -movementQty : movementQty, beforeQty, afterQty, payload.reason, payload.note || '', payload.productId, req.user.id);
        helpers.addAuditLog('تعديل مخزون', `تم تعديل مخزون الصنف #${payload.productId} من ${beforeQty} إلى ${afterQty} بسبب ${payload.reason}`, req.user.id);
        persistRelationalState();
        return { productId: payload.productId, beforeQty, afterQty };
      });
      const result = tx();
      created(res, { ok: true, adjustment: result, products: relationalProducts(), stockMovements: relationalStockMovements(), auditLogs: relationalAuditLogs() });
    } catch (err) {
      fail(res, err, 'Could not create inventory adjustment');
    }
  });

  app.delete('/api/products/:id', authMiddleware, requirePermission('canDelete'), (req, res) => {
    try {
      const productId = Number(req.params.id);
      helpers.assertProductDeletionAllowed(productId);
      const tx = db.transaction(() => {
        db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(productId);
        persistRelationalState();
      });
      tx();
      ok(res, { ok: true, products: relationalProducts() });
    } catch (err) {
      fail(res, err, 'Could not delete product');
    }
  });
}

module.exports = { registerProductRoutes };
