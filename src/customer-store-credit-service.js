function createCustomerStoreCreditService({ db }) {
  if (!db) throw new Error('db is required');

  function updateCustomerStoreCredit(customerId, delta) {
    if (!customerId || Math.abs(Number(delta || 0)) < 0.0001) return 0;
    const current = db.prepare('SELECT store_credit_balance FROM customers WHERE id = ? AND is_active = 1').get(customerId);
    if (!current) throw new Error('Customer not found');
    const nextBalance = Number((Number(current.store_credit_balance || 0) + Number(delta || 0)).toFixed(2));
    if (nextBalance < -0.0001) throw new Error('Store credit balance cannot become negative');
    const normalizedBalance = Math.max(0, nextBalance);
    db.prepare('UPDATE customers SET store_credit_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(normalizedBalance, customerId);
    return normalizedBalance;
  }

  return { updateCustomerStoreCredit };
}

module.exports = { createCustomerStoreCreditService };
