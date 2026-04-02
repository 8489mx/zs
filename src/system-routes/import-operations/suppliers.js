const { createImportSummary } = require('./shared');

function createSuppliersImporter({ db, normalizeSupplier, relationalSuppliers, persistRelationalState, addAuditLog }) {
  return function importSuppliersRows(rows, actor) {
    const summary = createImportSummary();
    const tx = db.transaction(() => {
      rows.forEach((row, index) => {
        try {
          const payload = normalizeSupplier({
            name: row.name,
            phone: row.phone,
            address: row.address,
            balance: row.openingBalance,
            notes: row.notes,
          });
          if (!payload.name) throw new Error('اسم المورد مطلوب');
          const existing = db.prepare('SELECT id FROM suppliers WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(payload.name);
          if (existing) {
            db.prepare('UPDATE suppliers SET name = ?, phone = ?, address = ?, balance = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(payload.name, payload.phone, payload.address, payload.balance, payload.notes, Number(existing.id));
            summary.updated += 1;
          } else {
            db.prepare('INSERT INTO suppliers (name, phone, address, balance, notes, is_active) VALUES (?, ?, ?, ?, ?, 1)')
              .run(payload.name, payload.phone, payload.address, payload.balance, payload.notes);
            summary.created += 1;
          }
        } catch (error) {
          summary.skipped += 1;
          summary.errors.push({ row: index + 1, error: error && error.message ? error.message : 'تعذر استيراد المورد' });
        }
      });
      persistRelationalState();
    });
    tx();
    addAuditLog('استيراد موردين', `تم استيراد الموردين بواسطة ${actor.username} (جديد ${summary.created} / محدث ${summary.updated} / متخطى ${summary.skipped})`, actor.id);
    return { ok: true, summary, suppliers: relationalSuppliers() };
  };
}

module.exports = {
  createSuppliersImporter,
};
