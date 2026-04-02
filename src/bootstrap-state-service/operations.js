function createBootstrapOperationalOps({
  db,
  sanitizeLegacyState,
  persistAppStateOnly,
}) {
  function migrateLegacyOperationalData(getStoredAppState) {
    const state = getStoredAppState();
    const hasLegacy = (Array.isArray(state.purchases) && state.purchases.length)
      || (Array.isArray(state.expenses) && state.expenses.length)
      || (Array.isArray(state.supplierPayments) && state.supplierPayments.length)
      || (Array.isArray(state.returns) && state.returns.length);
    if (!hasLegacy) return;

    const tx = db.transaction(() => {
      if (db.prepare('SELECT COUNT(*) AS count FROM purchases').get().count === 0) {
        for (const purchase of state.purchases || []) {
          const result = db.prepare(`
            INSERT INTO purchases (doc_no, supplier_id, payment_type, subtotal, discount, total, note, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            String(purchase.docNo || '').trim() || null,
            purchase.supplierId ? Number(purchase.supplierId) : null,
            purchase.paymentType === 'credit' ? 'credit' : 'cash',
            Number(purchase.subTotal || 0),
            Number(purchase.discount || 0),
            Number(purchase.total || 0),
            String(purchase.note || ''),
            purchase.status === 'draft' ? 'draft' : (purchase.status === 'cancelled' ? 'cancelled' : 'posted'),
            purchase.date || new Date().toISOString()
          );
          const purchaseId = Number(result.lastInsertRowid);
          for (const item of purchase.items || []) {
            db.prepare(`
              INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, unit_cost, line_total, unit_name, unit_multiplier)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              purchaseId,
              item.productId ? Number(item.productId) : null,
              String(item.name || ''),
              Number(item.qty || 0),
              Number(item.cost || 0),
              Number(item.total || (Number(item.qty || 0) * Number(item.cost || 0))),
              String(item.unitName || 'قطعة'),
              Number(item.unitMultiplier || 1)
            );
          }
        }
      }
      if (db.prepare('SELECT COUNT(*) AS count FROM expenses').get().count === 0) {
        for (const expense of state.expenses || []) {
          db.prepare('INSERT INTO expenses (title, amount, expense_date, note, created_at) VALUES (?, ?, ?, ?, ?)').run(String(expense.title || ''), Number(expense.amount || 0), expense.date || new Date().toISOString(), String(expense.note || ''), expense.date || new Date().toISOString());
        }
      }
      if (db.prepare('SELECT COUNT(*) AS count FROM supplier_payments').get().count === 0) {
        for (const payment of state.supplierPayments || []) {
          db.prepare('INSERT INTO supplier_payments (doc_no, supplier_id, amount, note, payment_date, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(String(payment.docNo || '').trim() || null, payment.supplierId ? Number(payment.supplierId) : null, Number(payment.amount || 0), String(payment.note || ''), payment.date || new Date().toISOString(), payment.date || new Date().toISOString());
        }
      }
      if (db.prepare('SELECT COUNT(*) AS count FROM returns').get().count === 0) {
        for (const entry of state.returns || []) {
          db.prepare('INSERT INTO returns (doc_no, return_type, invoice_id, product_id, product_name, qty, total, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(String(entry.docNo || '').trim() || null, entry.type === 'purchase' ? 'purchase' : 'sale', entry.invoiceId ? Number(entry.invoiceId) : null, entry.productId ? Number(entry.productId) : null, String(entry.productName || ''), Number(entry.qty || 0), Number(entry.total || 0), String(entry.note || ''), entry.date || new Date().toISOString());
        }
      }
      const sanitized = sanitizeLegacyState({ ...state, purchases: [], expenses: [], supplierPayments: [], returns: [] });
      persistAppStateOnly(sanitized);
    });
    tx();
  }

  function replaceOperationalBackupData(payload) {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM returns').run();
      db.prepare('DELETE FROM supplier_payments').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM purchase_items').run();
      db.prepare('DELETE FROM purchases').run();

      for (const purchase of payload.purchases || []) {
        const result = db.prepare(`
          INSERT INTO purchases (doc_no, supplier_id, payment_type, subtotal, discount, total, note, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(purchase.docNo || '').trim() || null,
          purchase.supplierId ? Number(purchase.supplierId) : null,
          purchase.paymentType === 'credit' ? 'credit' : 'cash',
          Number(purchase.subTotal || 0),
          Number(purchase.discount || 0),
          Number(purchase.total || 0),
          String(purchase.note || ''),
          purchase.status === 'draft' ? 'draft' : (purchase.status === 'cancelled' ? 'cancelled' : 'posted'),
          purchase.date || new Date().toISOString(),
          purchase.date || new Date().toISOString()
        );
        const purchaseId = Number(result.lastInsertRowid);
        for (const item of purchase.items || []) {
          db.prepare(`
            INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, unit_cost, line_total, unit_name, unit_multiplier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            purchaseId,
            item.productId ? Number(item.productId) : null,
            String(item.name || ''),
            Number(item.qty || 0),
            Number(item.cost || 0),
            Number(item.total || (Number(item.qty || 0) * Number(item.cost || 0))),
            String(item.unitName || 'قطعة'),
            Number(item.unitMultiplier || 1)
          );
        }
      }

      for (const expense of payload.expenses || []) {
        db.prepare('INSERT INTO expenses (title, amount, expense_date, note, created_at) VALUES (?, ?, ?, ?, ?)').run(String(expense.title || ''), Number(expense.amount || 0), expense.date || new Date().toISOString(), String(expense.note || ''), expense.date || new Date().toISOString());
      }

      for (const payment of payload.supplierPayments || []) {
        db.prepare('INSERT INTO supplier_payments (doc_no, supplier_id, amount, note, payment_date, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(String(payment.docNo || '').trim() || null, payment.supplierId ? Number(payment.supplierId) : null, Number(payment.amount || 0), String(payment.note || ''), payment.date || new Date().toISOString(), payment.date || new Date().toISOString());
      }

      for (const entry of payload.returns || []) {
        db.prepare('INSERT INTO returns (doc_no, return_type, invoice_id, product_id, product_name, qty, total, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(String(entry.docNo || '').trim() || null, entry.type === 'purchase' ? 'purchase' : 'sale', entry.invoiceId ? Number(entry.invoiceId) : null, entry.productId ? Number(entry.productId) : null, String(entry.productName || ''), Number(entry.qty || 0), Number(entry.total || 0), String(entry.note || ''), entry.date || new Date().toISOString());
      }
    });
    tx();
  }

  return {
    migrateLegacyOperationalData,
    replaceOperationalBackupData,
  };
}

module.exports = { createBootstrapOperationalOps };
