function createInventoryReportingService({ db, getSetting }) {
  function inventoryReport() {
    const lowStockThreshold = Number(getSetting('lowStockThreshold', '5'));
    const items = db.prepare(`
      SELECT p.id, p.name, p.stock_qty, p.min_stock_qty, c.name AS category_name, s.name AS supplier_name
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.is_active = 1
      ORDER BY p.stock_qty ASC, p.id DESC
    `).all().map((row) => ({
      id: String(row.id),
      name: row.name || '',
      stock: Number(row.stock_qty || 0),
      minStock: Number(row.min_stock_qty || 0),
      category: row.category_name || '',
      supplier: row.supplier_name || '',
      status: Number(row.stock_qty || 0) <= 0 ? 'out' : (Number(row.stock_qty || 0) <= Math.max(Number(row.min_stock_qty || 0), lowStockThreshold) ? 'low' : 'ok')
    }));
    const totalProducts = items.length;
    const outOfStock = items.filter((item) => item.status === 'out').length;
    const lowStock = items.filter((item) => item.status === 'low').length;
    return { totalProducts, outOfStock, lowStock, summary: { totalProducts, outOfStock, lowStock }, items };
  }

  function customerBalanceReport() {
    return db.prepare(`
      SELECT id, name, phone, balance, credit_limit
      FROM customers
      WHERE is_active = 1 AND balance > 0
      ORDER BY balance DESC, id DESC
    `).all().map((row) => ({
      id: String(row.id),
      name: row.name || '',
      phone: row.phone || '',
      balance: Number(row.balance || 0),
      creditLimit: Number(row.credit_limit || 0)
    }));
  }

  return { inventoryReport, customerBalanceReport };
}

module.exports = { createInventoryReportingService };
