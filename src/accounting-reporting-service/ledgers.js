const { normalizeLedgerEntry, summarizeLedgerEntries } = require('./shared');

function createLedgerReportingService({ db }) {
  function currentCustomerBalance(customerId) {
    const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM customer_ledger WHERE customer_id = ?').get(customerId);
    return Number(row?.balance || 0);
  }

  function currentSupplierBalance(supplierId) {
    const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM supplier_ledger WHERE supplier_id = ?').get(supplierId);
    return Number(row?.balance || 0);
  }

  function addCustomerLedgerEntry(customerId, entryType, amount, note, referenceType, referenceId, userId) {
    if (!customerId) return null;
    const nextBalance = currentCustomerBalance(customerId) + Number(amount || 0);
    db.prepare(`
      INSERT INTO customer_ledger (customer_id, entry_type, amount, balance_after, note, reference_type, reference_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, String(entryType || 'manual'), Number(amount || 0), nextBalance, String(note || ''), referenceType || null, referenceId || null, userId || null);
    db.prepare('UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextBalance, customerId);
    return nextBalance;
  }

  function addSupplierLedgerEntry(supplierId, entryType, amount, note, referenceType, referenceId, userId) {
    if (!supplierId) return null;
    const nextBalance = currentSupplierBalance(supplierId) + Number(amount || 0);
    db.prepare(`
      INSERT INTO supplier_ledger (supplier_id, entry_type, amount, balance_after, note, reference_type, reference_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(supplierId, String(entryType || 'manual'), Number(amount || 0), nextBalance, String(note || ''), referenceType || null, referenceId || null, userId || null);
    db.prepare('UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextBalance, supplierId);
    return nextBalance;
  }

  function customerLedgerReport(customerId) {
    const customer = db.prepare('SELECT id, name, phone, balance, credit_limit FROM customers WHERE id = ? AND is_active = 1').get(customerId);
    if (!customer) {
      const err = new Error('Customer not found');
      err.statusCode = 404;
      throw err;
    }
    const entries = db.prepare(`
      SELECT id, entry_type, amount, balance_after, note, reference_type, reference_id, created_at
      FROM customer_ledger
      WHERE customer_id = ?
      ORDER BY datetime(created_at) ASC, id ASC
    `).all(customerId).map(normalizeLedgerEntry);
    return {
      customer: {
        id: String(customer.id),
        name: customer.name || '',
        phone: customer.phone || '',
        balance: Number(customer.balance || 0),
        creditLimit: Number(customer.credit_limit || 0)
      },
      entries,
      summary: summarizeLedgerEntries(entries)
    };
  }

  function supplierLedgerReport(supplierId) {
    const supplier = db.prepare('SELECT id, name, phone, balance FROM suppliers WHERE id = ? AND is_active = 1').get(supplierId);
    if (!supplier) {
      const err = new Error('Supplier not found');
      err.statusCode = 404;
      throw err;
    }
    const entries = db.prepare(`
      SELECT id, entry_type, amount, balance_after, note, reference_type, reference_id, created_at
      FROM supplier_ledger
      WHERE supplier_id = ?
      ORDER BY datetime(created_at) ASC, id ASC
    `).all(supplierId).map(normalizeLedgerEntry);
    return {
      supplier: {
        id: String(supplier.id),
        name: supplier.name || '',
        phone: supplier.phone || '',
        balance: Number(supplier.balance || 0)
      },
      entries,
      summary: summarizeLedgerEntries(entries)
    };
  }

  function backfillLedgersIfNeeded() {
    const customerLedgerCount = Number(db.prepare('SELECT COUNT(*) AS count FROM customer_ledger').get().count || 0);
    const supplierLedgerCount = Number(db.prepare('SELECT COUNT(*) AS count FROM supplier_ledger').get().count || 0);
    if (customerLedgerCount > 0 && supplierLedgerCount > 0) return;

    const tx = db.transaction(() => {
      if (customerLedgerCount === 0) {
        db.prepare('DELETE FROM customer_ledger').run();
        db.prepare('UPDATE customers SET balance = 0, updated_at = CURRENT_TIMESTAMP').run();
        const creditSales = db.prepare(`
          SELECT id, customer_id, total, doc_no, created_by, created_at
          FROM sales
          WHERE status = 'posted' AND payment_type = 'credit' AND customer_id IS NOT NULL
          ORDER BY datetime(created_at) ASC, id ASC
        `).all();
        for (const row of creditSales) {
          addCustomerLedgerEntry(Number(row.customer_id), 'sale_credit', Number(row.total || 0), `فاتورة بيع ${row.doc_no || row.id}`, 'sale', Number(row.id), row.created_by || null);
          db.prepare('UPDATE customer_ledger SET created_at = ? WHERE id = last_insert_rowid()').run(row.created_at || new Date().toISOString());
        }
        const payments = db.prepare(`
          SELECT id, customer_id, amount, note, created_by, created_at
          FROM customer_payments
          ORDER BY datetime(created_at) ASC, id ASC
        `).all();
        for (const row of payments) {
          addCustomerLedgerEntry(Number(row.customer_id), 'customer_payment', -Number(row.amount || 0), row.note || `تحصيل عميل #${row.id}`, 'customer_payment', Number(row.id), row.created_by || null);
          db.prepare('UPDATE customer_ledger SET created_at = ? WHERE id = last_insert_rowid()').run(row.created_at || new Date().toISOString());
        }
        const saleReturns = db.prepare(`
          SELECT r.id, s.customer_id, r.total, r.doc_no, r.created_by, r.created_at
          FROM returns r
          JOIN sales s ON s.id = r.invoice_id
          WHERE r.return_type = 'sale' AND s.payment_type = 'credit' AND s.customer_id IS NOT NULL
          ORDER BY datetime(r.created_at) ASC, r.id ASC
        `).all();
        for (const row of saleReturns) {
          addCustomerLedgerEntry(Number(row.customer_id), 'sale_return_credit', -Number(row.total || 0), `مرتجع بيع ${row.doc_no || row.id}`, 'sale_return', Number(row.id), row.created_by || null);
          db.prepare('UPDATE customer_ledger SET created_at = ? WHERE id = last_insert_rowid()').run(row.created_at || new Date().toISOString());
        }
      }

      if (supplierLedgerCount === 0) {
        db.prepare('DELETE FROM supplier_ledger').run();
        db.prepare('UPDATE suppliers SET balance = 0, updated_at = CURRENT_TIMESTAMP').run();
        const creditPurchases = db.prepare(`
          SELECT id, supplier_id, total, doc_no, created_by, created_at
          FROM purchases
          WHERE status = 'posted' AND payment_type = 'credit' AND supplier_id IS NOT NULL
          ORDER BY datetime(created_at) ASC, id ASC
        `).all();
        for (const row of creditPurchases) {
          addSupplierLedgerEntry(Number(row.supplier_id), 'purchase_credit', Number(row.total || 0), `فاتورة شراء ${row.doc_no || row.id}`, 'purchase', Number(row.id), row.created_by || null);
          db.prepare('UPDATE supplier_ledger SET created_at = ? WHERE id = last_insert_rowid()').run(row.created_at || new Date().toISOString());
        }
        const payments = db.prepare(`
          SELECT id, supplier_id, amount, note, created_by, created_at
          FROM supplier_payments
          ORDER BY datetime(created_at) ASC, id ASC
        `).all();
        for (const row of payments) {
          addSupplierLedgerEntry(Number(row.supplier_id), 'supplier_payment', -Number(row.amount || 0), row.note || `دفع مورد #${row.id}`, 'supplier_payment', Number(row.id), row.created_by || null);
          db.prepare('UPDATE supplier_ledger SET created_at = ? WHERE id = last_insert_rowid()').run(row.created_at || new Date().toISOString());
        }
        const purchaseReturns = db.prepare(`
          SELECT r.id, p.supplier_id, r.total, r.doc_no, r.created_by, r.created_at
          FROM returns r
          JOIN purchases p ON p.id = r.invoice_id
          WHERE r.return_type = 'purchase' AND p.payment_type = 'credit' AND p.supplier_id IS NOT NULL
          ORDER BY datetime(r.created_at) ASC, r.id ASC
        `).all();
        for (const row of purchaseReturns) {
          addSupplierLedgerEntry(Number(row.supplier_id), 'purchase_return_credit', -Number(row.total || 0), `مرتجع شراء ${row.doc_no || row.id}`, 'purchase_return', Number(row.id), row.created_by || null);
          db.prepare('UPDATE supplier_ledger SET created_at = ? WHERE id = last_insert_rowid()').run(row.created_at || new Date().toISOString());
        }
      }
    });

    tx();
  }

  return { addCustomerLedgerEntry, addSupplierLedgerEntry, customerLedgerReport, supplierLedgerReport, backfillLedgersIfNeeded };
}

module.exports = { createLedgerReportingService };
