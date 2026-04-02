const { badRequest, created, fail, notFound, ok } = require('../http/respond');
const { parsePageParams, paginateRows, includesSearch } = require('./shared');

function registerCustomerRoutes(deps) {
  const {
    app, authMiddleware, requirePermission, normalizeCustomer, relationalCustomers,
    persistRelationalState, db, helpers,
  } = deps;

  app.get('/api/customers', authMiddleware, (req, res) => {
    const customers = relationalCustomers() || [];
    const { page, pageSize } = parsePageParams(req.query);
    const q = String(req.query.q || '').trim().toLowerCase();
    const filter = String(req.query.filter || 'all');
    if (!('page' in req.query) && !('pageSize' in req.query) && !q && filter === 'all') return res.json({ customers });
    const filtered = customers.filter((customer) => {
      if (filter === 'debt' && Number(customer.balance || 0) <= 0) return false;
      if (filter === 'vip' && customer.type !== 'vip') return false;
      if (filter === 'debt' && Number(customer.balance || 0) <= 0) return false;
      if (filter === 'cash' && customer.type != 'cash') return false;
      return includesSearch([customer.name, customer.phone, customer.address, customer.type], q);
    });
    const summary = {
      totalCustomers: filtered.length,
      totalBalance: filtered.reduce((sum, customer) => sum + Number(customer.balance || 0), 0),
      totalCredit: filtered.reduce((sum, customer) => sum + Number(customer.creditLimit || 0), 0),
      vipCount: filtered.filter((customer) => customer.type === 'vip').length,
    };
    const paged = paginateRows(filtered, page, pageSize);
    res.json({ customers: paged.rows, pagination: paged.pagination, summary });
  });

  app.post('/api/customers', authMiddleware, requirePermission('customers'), (req, res) => {
    try {
      const payload = normalizeCustomer(req.body || {});
      if (!payload.name) return badRequest(res, 'Customer name is required');
      const duplicate = db.prepare('SELECT id FROM customers WHERE lower(name) = lower(?) AND is_active = 1').get(payload.name);
      if (duplicate) return badRequest(res, 'Customer already exists');
      db.prepare('INSERT INTO customers (name, phone, address, balance, customer_type, credit_limit, store_credit_balance, company_name, tax_number, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)')
        .run(payload.name, payload.phone, payload.address, payload.balance, payload.type, payload.creditLimit, payload.storeCreditBalance || 0, payload.companyName || '', payload.taxNumber || '');
      persistRelationalState();
      created(res, { ok: true, customers: relationalCustomers() });
    } catch (err) {
      fail(res, err, 'Could not create customer');
    }
  });

  app.put('/api/customers/:id', authMiddleware, requirePermission('customers'), (req, res) => {
    try {
      const customerId = Number(req.params.id);
      const payload = normalizeCustomer(req.body || {});
      if (!payload.name) return badRequest(res, 'Customer name is required');
      const existing = db.prepare('SELECT id FROM customers WHERE id = ? AND is_active = 1').get(customerId);
      if (!existing) return notFound(res, 'Customer not found');
      const duplicate = db.prepare('SELECT id FROM customers WHERE lower(name) = lower(?) AND id != ? AND is_active = 1').get(payload.name, customerId);
      if (duplicate) return badRequest(res, 'Customer already exists');
      db.prepare('UPDATE customers SET name = ?, phone = ?, address = ?, balance = ?, customer_type = ?, credit_limit = ?, store_credit_balance = ?, company_name = ?, tax_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(payload.name, payload.phone, payload.address, payload.balance, payload.type, payload.creditLimit, payload.storeCreditBalance || 0, payload.companyName || '', payload.taxNumber || '', customerId);
      persistRelationalState();
      ok(res, { ok: true, customers: relationalCustomers() });
    } catch (err) {
      fail(res, err, 'Could not update customer');
    }
  });

  app.delete('/api/customers/:id', authMiddleware, requirePermission('canDelete'), (req, res) => {
    try {
      const customerId = Number(req.params.id);
      helpers.assertCustomerDeletionAllowed(customerId);
      const inUse = db.prepare('SELECT COUNT(*) AS count FROM product_customer_prices WHERE customer_id = ?').get(customerId);
      if (Number(inUse.count || 0) > 0) {
        db.prepare('DELETE FROM product_customer_prices WHERE customer_id = ?').run(customerId);
      }
      db.prepare('UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(customerId);
      persistRelationalState();
      ok(res, { ok: true, customers: relationalCustomers() });
    } catch (err) {
      fail(res, err, 'Could not delete customer');
    }
  });
}

module.exports = { registerCustomerRoutes };
