const { getRateLimitKey } = require('../request-context');

function parsePageParams(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(query.pageSize) || 20));
  return { page, pageSize };
}

function paginateRows(rows, page, pageSize) {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pagination: { page: safePage, pageSize, totalItems, totalPages }
  };
}

function includesSearch(values, query) {
  if (!query) return true;
  return values.some((value) => String(value || '').toLowerCase().includes(query));
}

function createCatalogRouteHelpers({ db, inventoryAdjustmentRateLimit, assertManagerPin, addAuditLog }) {
  function ensureActiveProductIdentityAvailable(payload, productId = null) {
    const normalizedName = String(payload && payload.name || '').trim();
    const normalizedBarcode = String(payload && payload.barcode || '').trim();
    if (normalizedName) {
      const duplicateName = productId
        ? db.prepare('SELECT id FROM products WHERE lower(name) = lower(?) AND id != ? AND is_active = 1').get(normalizedName, Number(productId))
        : db.prepare('SELECT id FROM products WHERE lower(name) = lower(?) AND is_active = 1').get(normalizedName);
      if (duplicateName) throw new Error('Product already exists');
    }
    if (normalizedBarcode) {
      const duplicateBarcode = productId
        ? db.prepare('SELECT id FROM products WHERE lower(barcode) = lower(?) AND id != ? AND is_active = 1').get(normalizedBarcode, Number(productId))
        : db.prepare('SELECT id FROM products WHERE lower(barcode) = lower(?) AND is_active = 1').get(normalizedBarcode);
      if (duplicateBarcode) throw new Error('Barcode already exists');
    }
  }

  function assertCustomerDeletionAllowed(customerId) {
    const customer = db.prepare('SELECT id, balance, store_credit_balance FROM customers WHERE id = ? AND is_active = 1').get(customerId);
    if (!customer) throw new Error('Customer not found');
    if (Math.abs(Number(customer.balance || 0)) > 0.0001) throw new Error('Customer has outstanding balance');
    if (Math.abs(Number(customer.store_credit_balance || 0)) > 0.0001) throw new Error('Customer has store credit balance');
    const saleCount = Number((db.prepare('SELECT COUNT(*) AS count FROM sales WHERE customer_id = ?').get(customerId) || {}).count || 0);
    const paymentCount = Number((db.prepare('SELECT COUNT(*) AS count FROM customer_payments WHERE customer_id = ?').get(customerId) || {}).count || 0);
    const ledgerCount = Number((db.prepare('SELECT COUNT(*) AS count FROM customer_ledger WHERE customer_id = ?').get(customerId) || {}).count || 0);
    if (saleCount || paymentCount || ledgerCount) throw new Error('Customer has financial history and cannot be deleted');
  }

  function assertSupplierDeletionAllowed(supplierId) {
    const supplier = db.prepare('SELECT id, balance FROM suppliers WHERE id = ? AND is_active = 1').get(supplierId);
    if (!supplier) throw new Error('Supplier not found');
    if (Math.abs(Number(supplier.balance || 0)) > 0.0001) throw new Error('Supplier has outstanding balance');
    const purchaseCount = Number((db.prepare('SELECT COUNT(*) AS count FROM purchases WHERE supplier_id = ?').get(supplierId) || {}).count || 0);
    const paymentCount = Number((db.prepare('SELECT COUNT(*) AS count FROM supplier_payments WHERE supplier_id = ?').get(supplierId) || {}).count || 0);
    const ledgerCount = Number((db.prepare('SELECT COUNT(*) AS count FROM supplier_ledger WHERE supplier_id = ?').get(supplierId) || {}).count || 0);
    if (purchaseCount || paymentCount || ledgerCount) throw new Error('Supplier has financial history and cannot be deleted');
  }

  function assertProductDeletionAllowed(productId) {
    const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) throw new Error('Product not found');
    if (Math.abs(Number(product.stock_qty || 0)) > 0.0001) throw new Error('Product still has stock on hand');
    const saleCount = Number((db.prepare('SELECT COUNT(*) AS count FROM sale_items WHERE product_id = ?').get(productId) || {}).count || 0);
    const purchaseCount = Number((db.prepare('SELECT COUNT(*) AS count FROM purchase_items WHERE product_id = ?').get(productId) || {}).count || 0);
    const returnCount = Number((db.prepare('SELECT COUNT(*) AS count FROM returns WHERE product_id = ?').get(productId) || {}).count || 0);
    const movementCount = Number((db.prepare('SELECT COUNT(*) AS count FROM stock_movements WHERE product_id = ?').get(productId) || {}).count || 0);
    if (saleCount || purchaseCount || returnCount || movementCount) throw new Error('Product has transaction history and cannot be deleted');
  }

  return {
    getRateLimitKey,
    parsePageParams,
    paginateRows,
    includesSearch,
    inventoryAdjustmentRateLimit,
    assertManagerPin,
    addAuditLog,
    ensureActiveProductIdentityAvailable,
    assertCustomerDeletionAllowed,
    assertSupplierDeletionAllowed,
    assertProductDeletionAllowed,
  };
}

module.exports = {
  parsePageParams,
  paginateRows,
  includesSearch,
  createCatalogRouteHelpers,
};
