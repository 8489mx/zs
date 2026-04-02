const { getDb, safeCount } = require('./shared');

function buildMaintenanceReport() {
  const customerMismatches = getDb().prepare(`
    SELECT c.id, c.name, c.balance,
      COALESCE((SELECT cl.balance_after FROM customer_ledger cl WHERE cl.customer_id = c.id ORDER BY cl.id DESC LIMIT 1), 0) AS ledger_balance
    FROM customers c
    WHERE ABS(COALESCE(c.balance, 0) - COALESCE((SELECT cl.balance_after FROM customer_ledger cl WHERE cl.customer_id = c.id ORDER BY cl.id DESC LIMIT 1), 0)) > 0.009
    ORDER BY ABS(c.balance - COALESCE((SELECT cl.balance_after FROM customer_ledger cl WHERE cl.customer_id = c.id ORDER BY cl.id DESC LIMIT 1), 0)) DESC
    LIMIT 25
  `).all();
  const supplierMismatches = getDb().prepare(`
    SELECT s.id, s.name, s.balance,
      COALESCE((SELECT sl.balance_after FROM supplier_ledger sl WHERE sl.supplier_id = s.id ORDER BY sl.id DESC LIMIT 1), 0) AS ledger_balance
    FROM suppliers s
    WHERE ABS(COALESCE(s.balance, 0) - COALESCE((SELECT sl.balance_after FROM supplier_ledger sl WHERE sl.supplier_id = s.id ORDER BY sl.id DESC LIMIT 1), 0)) > 0.009
    ORDER BY ABS(s.balance - COALESCE((SELECT sl.balance_after FROM supplier_ledger sl WHERE sl.supplier_id = s.id ORDER BY sl.id DESC LIMIT 1), 0)) DESC
    LIMIT 25
  `).all();
  const orphanSaleItems = getDb().prepare(`
    SELECT si.id, si.sale_id, si.product_name FROM sale_items si
    LEFT JOIN sales s ON s.id = si.sale_id
    WHERE s.id IS NULL LIMIT 25
  `).all();
  const orphanPurchaseItems = getDb().prepare(`
    SELECT pi.id, pi.purchase_id, pi.product_name FROM purchase_items pi
    LEFT JOIN purchases p ON p.id = pi.purchase_id
    WHERE p.id IS NULL LIMIT 25
  `).all();
  const negativeStockProducts = getDb().prepare(`
    SELECT id, name, stock_qty FROM products WHERE stock_qty < 0 ORDER BY stock_qty ASC LIMIT 25
  `).all();
  const expiredSessions = safeCount('sessions', "WHERE expires_at < datetime('now')");
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      expiredSessions,
      customerLedgerMismatches: customerMismatches.length,
      supplierLedgerMismatches: supplierMismatches.length,
      orphanSaleItems: orphanSaleItems.length,
      orphanPurchaseItems: orphanPurchaseItems.length,
      negativeStockProducts: negativeStockProducts.length
    },
    customerLedgerMismatches: customerMismatches,
    supplierLedgerMismatches: supplierMismatches,
    orphanSaleItems,
    orphanPurchaseItems,
    negativeStockProducts
  };
}

function cleanupExpiredSessions() {
  const result = getDb().prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  return { ok: true, deletedSessions: Number(result.changes || 0), ranAt: new Date().toISOString() };
}


function reconcileCustomerBalances() {
  const customers = getDb().prepare('SELECT id, name, balance FROM customers ORDER BY id ASC').all();
  let updated = 0;
  const changes = [];
  const stmt = getDb().prepare('UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  customers.forEach((customer) => {
    const expected = Number((getDb().prepare('SELECT COALESCE(balance_after, 0) AS balance_after FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 1').get(customer.id) || {}).balance_after || 0);
    const current = Number(customer.balance || 0);
    if (Math.abs(current - expected) > 0.009) {
      stmt.run(expected, customer.id);
      updated += 1;
      changes.push({ id: customer.id, name: customer.name, before: current, after: expected });
    }
  });
  return { ok: true, entity: 'customers', updated, changes, ranAt: new Date().toISOString() };
}

function reconcileSupplierBalances() {
  const suppliers = getDb().prepare('SELECT id, name, balance FROM suppliers ORDER BY id ASC').all();
  let updated = 0;
  const changes = [];
  const stmt = getDb().prepare('UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  suppliers.forEach((supplier) => {
    const expected = Number((getDb().prepare('SELECT COALESCE(balance_after, 0) AS balance_after FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1').get(supplier.id) || {}).balance_after || 0);
    const current = Number(supplier.balance || 0);
    if (Math.abs(current - expected) > 0.009) {
      stmt.run(expected, supplier.id);
      updated += 1;
      changes.push({ id: supplier.id, name: supplier.name, before: current, after: expected });
    }
  });
  return { ok: true, entity: 'suppliers', updated, changes, ranAt: new Date().toISOString() };
}

function reconcileAllBalances() {
  const customerResult = reconcileCustomerBalances();
  const supplierResult = reconcileSupplierBalances();
  return {
    ok: true,
    ranAt: new Date().toISOString(),
    customers: customerResult,
    suppliers: supplierResult,
    updatedTotal: Number(customerResult.updated || 0) + Number(supplierResult.updated || 0)
  };
}

module.exports = {
  buildMaintenanceReport,
  cleanupExpiredSessions,
  reconcileCustomerBalances,
  reconcileSupplierBalances,
  reconcileAllBalances,
};
