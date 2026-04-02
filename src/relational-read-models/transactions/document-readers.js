const { groupRowsByKey, mapJoinedScope } = require('./shared');

function createDocumentTransactionReaders({ db }) {
  function relationalSales() {
    const sales = db.prepare(`
      SELECT s.id, s.doc_no, s.customer_id, c.name AS customer_name_ref, s.customer_name, s.payment_type, s.payment_channel,
             s.subtotal, s.discount, s.tax_rate, s.tax_amount, s.prices_include_tax, s.total, s.paid_amount, s.store_credit_used, s.status, s.note, s.branch_id, s.location_id, s.created_at, b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN branches b ON b.id = s.branch_id
      LEFT JOIN stock_locations l ON l.id = s.location_id
      LEFT JOIN users u ON u.id = s.created_by
      ORDER BY s.id DESC
    `).all();

    const itemsBySale = groupRowsByKey(
      db.prepare(`
        SELECT id, sale_id, product_id, product_name, qty, unit_price, line_total, unit_name, unit_multiplier, cost_price, price_type
        FROM sale_items
        ORDER BY sale_id ASC, id ASC
      `).all(),
      'sale_id',
      (item) => ({
        id: String(item.id),
        productId: item.product_id ? String(item.product_id) : '',
        name: item.product_name || '',
        qty: Number(item.qty || 0),
        price: Number(item.unit_price || 0),
        total: Number(item.line_total || 0),
        unitName: item.unit_name || 'قطعة',
        unitMultiplier: Number(item.unit_multiplier || 1),
        cost: Number(item.cost_price || 0),
        priceType: item.price_type || 'retail',
      }),
    );

    const paymentsBySale = groupRowsByKey(
      db.prepare(`
        SELECT id, sale_id, payment_channel, amount
        FROM sale_payments
        ORDER BY sale_id ASC, id ASC
      `).all(),
      'sale_id',
      (entry) => ({
        id: String(entry.id),
        paymentChannel: entry.payment_channel || 'cash',
        amount: Number(entry.amount || 0),
      }),
    );

    return sales.map((sale) => ({
      id: String(sale.id),
      docNo: sale.doc_no || `S-${sale.id}`,
      customerId: sale.customer_id ? String(sale.customer_id) : '',
      customerName: sale.customer_name_ref || sale.customer_name || 'عميل نقدي',
      paymentType: sale.payment_type || 'cash',
      paymentChannel: sale.payment_channel || (sale.payment_type || 'cash'),
      subTotal: Number(sale.subtotal || 0),
      discount: Number(sale.discount || 0),
      taxRate: Number(sale.tax_rate || 0),
      taxAmount: Number(sale.tax_amount || 0),
      pricesIncludeTax: Boolean(Number(sale.prices_include_tax || 0)),
      total: Number(sale.total || 0),
      paidAmount: Number(sale.paid_amount || 0),
      payments: paymentsBySale.get(String(sale.id)) || [],
      storeCreditUsed: Number(sale.store_credit_used || 0),
      status: sale.status || 'posted',
      note: sale.note || '',
      createdBy: sale.created_by_name || '',
      date: sale.created_at,
      items: itemsBySale.get(String(sale.id)) || [],
      ...mapJoinedScope(sale),
    }));
  }

  function relationalPurchases() {
    const purchases = db.prepare(`
      SELECT p.id, p.doc_no, p.supplier_id, s.name AS supplier_name, p.payment_type, p.subtotal, p.discount, p.tax_rate, p.tax_amount, p.prices_include_tax, p.total,
             p.note, p.status, p.branch_id, p.location_id, p.created_at, b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN branches b ON b.id = p.branch_id
      LEFT JOIN stock_locations l ON l.id = p.location_id
      LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.id DESC
    `).all();

    const itemsByPurchase = groupRowsByKey(
      db.prepare(`
        SELECT id, purchase_id, product_id, product_name, qty, unit_cost, line_total, unit_name, unit_multiplier
        FROM purchase_items
        ORDER BY purchase_id ASC, id ASC
      `).all(),
      'purchase_id',
      (item) => ({
        id: String(item.id),
        productId: item.product_id ? String(item.product_id) : '',
        name: item.product_name || '',
        qty: Number(item.qty || 0),
        cost: Number(item.unit_cost || 0),
        total: Number(item.line_total || 0),
        unitName: item.unit_name || 'قطعة',
        unitMultiplier: Number(item.unit_multiplier || 1),
      }),
    );

    return purchases.map((purchase) => ({
      id: String(purchase.id),
      docNo: purchase.doc_no || `P-${purchase.id}`,
      supplierId: purchase.supplier_id ? String(purchase.supplier_id) : '',
      supplierName: purchase.supplier_name || '',
      paymentType: purchase.payment_type || 'cash',
      subTotal: Number(purchase.subtotal || 0),
      discount: Number(purchase.discount || 0),
      taxRate: Number(purchase.tax_rate || 0),
      taxAmount: Number(purchase.tax_amount || 0),
      pricesIncludeTax: Boolean(Number(purchase.prices_include_tax || 0)),
      total: Number(purchase.total || 0),
      note: purchase.note || '',
      status: purchase.status || 'posted',
      createdBy: purchase.created_by_name || '',
      date: purchase.created_at,
      items: itemsByPurchase.get(String(purchase.id)) || [],
      ...mapJoinedScope(purchase),
    }));
  }

  return { relationalSales, relationalPurchases };
}

module.exports = { createDocumentTransactionReaders };
