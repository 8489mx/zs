function restoreServicesFromBackup(db, services) {
  db.prepare('DELETE FROM services').run();
  for (const service of Array.isArray(services) ? services : []) {
    db.prepare('INSERT INTO services (name, amount, notes, service_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .run(
        String(service.name || ''),
        Number(service.amount || 0),
        String(service.notes || ''),
        service.date || new Date().toISOString(),
        service.createdAt || new Date().toISOString(),
        service.updatedAt || service.createdAt || new Date().toISOString(),
      );
  }
}

function replaceLedgerBackupData(db, payload) {
  db.prepare('DELETE FROM customer_ledger').run();
  db.prepare('DELETE FROM supplier_ledger').run();
  for (const entry of Array.isArray(payload.customerLedger) ? payload.customerLedger : []) {
    db.prepare('INSERT INTO customer_ledger (customer_id, entry_type, amount, balance_after, note, reference_type, reference_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        Number(entry.customer_id || entry.customerId || 0),
        String(entry.entry_type || entry.type || 'manual'),
        Number(entry.amount || 0),
        Number(entry.balance_after || entry.balanceAfter || 0),
        String(entry.note || ''),
        entry.reference_type || entry.referenceType || null,
        entry.reference_id || entry.referenceId || null,
        entry.created_by || null,
        entry.created_at || entry.date || new Date().toISOString(),
      );
  }
  for (const entry of Array.isArray(payload.supplierLedger) ? payload.supplierLedger : []) {
    db.prepare('INSERT INTO supplier_ledger (supplier_id, entry_type, amount, balance_after, note, reference_type, reference_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        Number(entry.supplier_id || entry.supplierId || 0),
        String(entry.entry_type || entry.type || 'manual'),
        Number(entry.amount || 0),
        Number(entry.balance_after || entry.balanceAfter || 0),
        String(entry.note || ''),
        entry.reference_type || entry.referenceType || null,
        entry.reference_id || entry.referenceId || null,
        entry.created_by || null,
        entry.created_at || entry.date || new Date().toISOString(),
      );
  }
}

module.exports = { restoreServicesFromBackup, replaceLedgerBackupData };
