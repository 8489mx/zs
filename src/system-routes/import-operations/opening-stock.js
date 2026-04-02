const { normalizeImportNumber, normalizeImportText } = require('./shared');

function createOpeningStockImporter({ db, relationalProducts, relationalStockMovements, persistRelationalState, addAuditLog }) {
  return function importOpeningStockRows(rows, actor) {
    const summary = { updated: 0, skipped: 0, errors: [] };
    const tx = db.transaction(() => {
      rows.forEach((row, index) => {
        try {
          const barcode = normalizeImportText(row.barcode, 120);
          const name = normalizeImportText(row.name, 160);
          const qty = normalizeImportNumber(row.qty, NaN);
          if (!(qty > 0)) throw new Error('كمية الرصيد الافتتاحي يجب أن تكون أكبر من صفر');
          const product = barcode
            ? db.prepare("SELECT * FROM products WHERE lower(COALESCE(barcode, '')) = lower(?) AND is_active = 1 LIMIT 1").get(barcode)
            : db.prepare('SELECT * FROM products WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(name);
          if (!product) throw new Error('الصنف غير موجود');
          const beforeQty = Number(product.stock_qty || product.stock || 0);
          const afterQty = beforeQty + qty;
          db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, Number(product.id));
          db.prepare('INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(Number(product.id), 'opening', qty, beforeQty, afterQty, 'opening_stock_import', normalizeImportText(row.note, 500) || 'Opening stock import', 'product', Number(product.id), actor.id);
          summary.updated += 1;
        } catch (error) {
          summary.skipped += 1;
          summary.errors.push({ row: index + 1, error: error && error.message ? error.message : 'تعذر استيراد الرصيد الافتتاحي' });
        }
      });
      persistRelationalState();
    });
    tx();
    addAuditLog('استيراد رصيد افتتاحي', `تم تحديث ${summary.updated} صنف عبر ملف الرصيد الافتتاحي بواسطة ${actor.username}`, actor.id);
    return { ok: true, summary, products: relationalProducts(), stockMovements: relationalStockMovements() };
  };
}

module.exports = {
  createOpeningStockImporter,
};
