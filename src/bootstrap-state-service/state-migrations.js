function createBootstrapStateMigrations({
  db,
  defaultState,
  mergeStateWithDefaults,
  sanitizeLegacyState,
  persistAppStateOnly,
  safeJsonParse,
}) {
  function migrateLegacyServicesToTable() {
    const count = db.prepare('SELECT COUNT(*) AS count FROM services WHERE is_active = 1').get();
    if (Number(count.count || 0) > 0) return;
    const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
    const rawState = row ? mergeStateWithDefaults(safeJsonParse(row.state_json, {})) : defaultState();
    const services = Array.isArray(rawState.services) ? rawState.services : [];
    if (!services.length) return;
    const insertService = db.prepare(`
      INSERT INTO services (name, amount, notes, service_date, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);
    const tx = db.transaction(() => {
      for (const service of services) {
        const name = String((service && service.name) || '').trim();
        const amount = Number((service && service.amount) || 0);
        if (!name || !(amount > 0)) continue;
        insertService.run(name, amount, String((service && service.notes) || '').trim(), service.date || new Date().toISOString());
      }
      const sanitized = sanitizeLegacyState(rawState);
      delete sanitized.services;
      persistAppStateOnly(sanitized);
    });
    tx();
  }

  function syncAuditLogs(state) {
    const entries = Array.isArray((state || {}).auditLogs) ? state.auditLogs.slice(0, 500) : [];
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM audit_logs').run();
      const findUserId = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) LIMIT 1');
      const insertLog = db.prepare('INSERT INTO audit_logs (action, details, created_by, created_at) VALUES (?, ?, ?, ?)');
      for (const log of entries) {
        const username = String((log && log.user) || '').trim();
        const matched = username ? findUserId.get(username) : null;
        insertLog.run(String((log && log.action) || ''), String((log && log.details) || ''), matched ? matched.id : null, String((log && log.date) || new Date().toISOString()));
      }
    });
    try { tx(); } catch (_) { }
  }

  function syncProductSchema(state) {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM stock_movements').run();
      db.prepare('DELETE FROM product_customer_prices').run();
      db.prepare('DELETE FROM product_offers').run();
      db.prepare('DELETE FROM product_units').run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM product_categories').run();
      db.prepare('DELETE FROM suppliers').run();
      db.prepare('DELETE FROM customers').run();

      for (const category of state.categories || []) {
        db.prepare('INSERT INTO product_categories (id, name, is_active) VALUES (?, ?, 1)').run(Number(String(category.id).replace(/\D/g, '')) || null, category.name || 'عام');
      }
      for (const supplier of state.suppliers || []) {
        db.prepare('INSERT INTO suppliers (id, name, phone, address, balance, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)').run(Number(String(supplier.id).replace(/\D/g, '')) || null, supplier.name || '', supplier.phone || '', supplier.address || '', Number(supplier.balance || 0), supplier.notes || '');
      }
      for (const customer of state.customers || []) {
        db.prepare('INSERT INTO customers (id, name, phone, address, balance, customer_type, credit_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').run(Number(String(customer.id).replace(/\D/g, '')) || null, customer.name || '', customer.phone || '', customer.address || '', Number(customer.balance || 0), customer.type || 'cash', Number(customer.creditLimit || 0));
      }
      for (const product of state.products || []) {
        const productId = Number(String(product.id).replace(/\D/g, '')) || null;
        db.prepare(`INSERT INTO products (id, name, barcode, cost_price, retail_price, wholesale_price, stock_qty, min_stock_qty, notes, is_active, price, cost, stock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`).run(productId, product.name || '', product.barcode || null, Number(product.costPrice || 0), Number(product.retailPrice || 0), Number(product.wholesalePrice || 0), Number(product.stock || 0), Number(product.minStock || 0), product.notes || '', Number(product.retailPrice || 0), Number(product.costPrice || 0), Number(product.stock || 0));
        for (const unit of product.units || []) {
          db.prepare('INSERT INTO product_units (product_id, name, multiplier, barcode, is_base_unit, is_sale_unit_default, is_purchase_unit_default) VALUES (?, ?, ?, ?, ?, ?, ?)').run(productId, unit.name || 'قطعة', Number(unit.multiplier || 1), unit.barcode || null, unit.isBaseUnit ? 1 : (Number(unit.multiplier || 1) === 1 ? 1 : 0), unit.isSaleUnit ? 1 : 0, unit.isPurchaseUnit ? 1 : 0);
        }
        for (const offer of product.offers || []) {
          db.prepare('INSERT INTO product_offers (product_id, offer_type, value, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, 1)').run(productId, offer.type || 'percent', Number(offer.value || 0), offer.from || null, offer.to || null);
        }
      }
      for (const movement of state.stockMovements || []) {
        db.prepare('INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(Number(String(movement.productId).replace(/\D/g, '')) || null, movement.type || 'adjust', Number(movement.qty || 0), Number(movement.beforeQty || 0), Number(movement.afterQty || 0), movement.reason || null, movement.note || null, movement.referenceType || null, movement.referenceId ? Number(movement.referenceId) : null, null, movement.date || new Date().toISOString());
      }
    });
    try { tx(); } catch (_) { }
  }

  return {
    migrateLegacyServicesToTable,
    syncAuditLogs,
    syncProductSchema,
  };
}

module.exports = { createBootstrapStateMigrations };
