function createCatalogReadModels({ db }) {
    function relationalCategories() {
      return db.prepare('SELECT id, name FROM product_categories WHERE is_active = 1 ORDER BY id ASC').all().map((r) => ({ id: String(r.id), name: r.name }));
    }

    function relationalSuppliers() {
      return db.prepare('SELECT id, name, phone, address, balance, notes FROM suppliers WHERE is_active = 1 ORDER BY id ASC').all().map((r) => ({
        id: String(r.id), name: r.name, phone: r.phone || '', address: r.address || '', balance: Number(r.balance || 0), notes: r.notes || ''
      }));
    }

    function relationalCustomers() {
      return db.prepare('SELECT id, name, phone, address, balance, customer_type, credit_limit, store_credit_balance FROM customers WHERE is_active = 1 ORDER BY id ASC').all().map((r) => ({
        id: String(r.id), name: r.name, phone: r.phone || '', address: r.address || '', balance: Number(r.balance || 0), type: r.customer_type || 'cash', creditLimit: Number(r.credit_limit || 0), storeCreditBalance: Number(r.store_credit_balance || 0)
      }));
    }

    function relationalProducts() {
      const products = db.prepare(`
        SELECT p.id, p.name, p.barcode, p.category_id, p.supplier_id, p.cost_price, p.retail_price, p.wholesale_price, p.stock_qty, p.min_stock_qty, p.notes
        FROM products p
        WHERE p.is_active = 1
        ORDER BY p.id DESC
      `).all();
      const units = db.prepare('SELECT id, product_id, name, multiplier, barcode, is_base_unit, is_sale_unit_default, is_purchase_unit_default FROM product_units ORDER BY product_id ASC, is_base_unit DESC, id ASC').all();
      const offers = db.prepare('SELECT id, product_id, offer_type, value, start_date, end_date FROM product_offers WHERE is_active = 1 ORDER BY id DESC').all();
      const customerPrices = db.prepare('SELECT id, product_id, customer_id, price FROM product_customer_prices ORDER BY id DESC').all();

      const unitsByProduct = new Map();
      for (const u of units) {
        const key = String(u.product_id);
        if (!unitsByProduct.has(key)) unitsByProduct.set(key, []);
        unitsByProduct.get(key).push({
          id: String(u.id),
          name: u.name || 'قطعة',
          multiplier: Number(u.multiplier || 1),
          barcode: u.barcode || '',
          isBaseUnit: Number(u.is_base_unit || 0) === 1,
          isSaleUnit: Number(u.is_sale_unit_default || 0) === 1,
          isPurchaseUnit: Number(u.is_purchase_unit_default || 0) === 1
        });
      }

      const offersByProduct = new Map();
      for (const o of offers) {
        const key = String(o.product_id);
        if (!offersByProduct.has(key)) offersByProduct.set(key, []);
        offersByProduct.get(key).push({
          id: String(o.id),
          type: o.offer_type,
          value: Number(o.value || 0),
          from: o.start_date || '',
          to: o.end_date || ''
        });
      }

      const pricesByProduct = new Map();
      for (const cp of customerPrices) {
        const key = String(cp.product_id);
        if (!pricesByProduct.has(key)) pricesByProduct.set(key, []);
        pricesByProduct.get(key).push({
          id: String(cp.id),
          customerId: String(cp.customer_id),
          price: Number(cp.price || 0)
        });
      }

      return products.map((p) => ({
        id: String(p.id),
        name: p.name || '',
        barcode: p.barcode || '',
        categoryId: p.category_id ? String(p.category_id) : '',
        supplierId: p.supplier_id ? String(p.supplier_id) : '',
        costPrice: Number(p.cost_price || 0),
        retailPrice: Number(p.retail_price || 0),
        wholesalePrice: Number(p.wholesale_price || 0),
        stock: Number(p.stock_qty || 0),
        minStock: Number(p.min_stock_qty || 0),
        notes: p.notes || '',
        units: unitsByProduct.get(String(p.id)) || [{ id: 'base-' + p.id, name: 'قطعة', multiplier: 1, barcode: p.barcode || '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
        offers: offersByProduct.get(String(p.id)) || [],
        customerPrices: pricesByProduct.get(String(p.id)) || []
      }));
    }

    function relationalServices() {
      return db.prepare(`
        SELECT s.id, s.name, s.amount, s.notes, s.service_date, s.created_at, s.updated_at, u.username AS created_by_name
        FROM services s
        LEFT JOIN users u ON u.id = s.created_by
        WHERE s.is_active = 1
        ORDER BY datetime(COALESCE(s.service_date, s.created_at)) DESC, s.id DESC
      `).all().map((r) => ({
        id: String(r.id),
        name: r.name || '',
        amount: Number(r.amount || 0),
        notes: r.notes || '',
        date: r.service_date || r.created_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        createdBy: r.created_by_name || ''
      }));
    }
  return {
    relationalCategories,
    relationalSuppliers,
    relationalCustomers,
    relationalProducts,
    relationalServices,
  };
}

module.exports = { createCatalogReadModels };
