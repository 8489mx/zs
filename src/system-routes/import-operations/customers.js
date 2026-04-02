const { createImportSummary } = require('./shared');

function createCustomersImporter({ db, normalizeCustomer, relationalCustomers, persistRelationalState, addAuditLog }) {
  return function importCustomersRows(rows, actor) {
    const summary = createImportSummary();
    const tx = db.transaction(() => {
      rows.forEach((row, index) => {
        try {
          const payload = normalizeCustomer({
            name: row.name,
            phone: row.phone,
            address: row.address,
            balance: row.openingBalance,
            type: row.type,
            creditLimit: row.creditLimit,
            storeCreditBalance: row.storeCreditBalance,
            companyName: row.companyName,
            taxNumber: row.taxNumber,
          });
          if (!payload.name) throw new Error('اسم العميل مطلوب');
          const existing = db.prepare('SELECT id FROM customers WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(payload.name);
          if (existing) {
            db.prepare('UPDATE customers SET name = ?, phone = ?, address = ?, balance = ?, customer_type = ?, credit_limit = ?, store_credit_balance = ?, company_name = ?, tax_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(payload.name, payload.phone, payload.address, payload.balance, payload.type, payload.creditLimit, payload.storeCreditBalance || 0, payload.companyName || '', payload.taxNumber || '', Number(existing.id));
            summary.updated += 1;
          } else {
            db.prepare('INSERT INTO customers (name, phone, address, balance, customer_type, credit_limit, store_credit_balance, company_name, tax_number, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)')
              .run(payload.name, payload.phone, payload.address, payload.balance, payload.type, payload.creditLimit, payload.storeCreditBalance || 0, payload.companyName || '', payload.taxNumber || '');
            summary.created += 1;
          }
        } catch (error) {
          summary.skipped += 1;
          summary.errors.push({ row: index + 1, error: error && error.message ? error.message : 'تعذر استيراد العميل' });
        }
      });
      persistRelationalState();
    });
    tx();
    addAuditLog('استيراد عملاء', `تم استيراد العملاء بواسطة ${actor.username} (جديد ${summary.created} / محدث ${summary.updated} / متخطى ${summary.skipped})`, actor.id);
    return { ok: true, summary, customers: relationalCustomers() };
  };
}

module.exports = {
  createCustomersImporter,
};
