const { createImportSummary, normalizeImportNumber, normalizeImportText } = require('./shared');

function createProductsImporter({
  db,
  normalizeIncomingProduct,
  normalizeSupplier,
  replaceProductRelations,
  relationalProducts,
  relationalCategories,
  relationalSuppliers,
  persistRelationalState,
  addAuditLog,
}) {
  function ensureCategoryByName(name) {
    const normalizedName = normalizeImportText(name, 120);
    if (!normalizedName) return null;
    const existing = db.prepare('SELECT id FROM product_categories WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(normalizedName);
    if (existing) return Number(existing.id);
    const result = db.prepare('INSERT INTO product_categories (name, is_active) VALUES (?, 1)').run(normalizedName);
    return Number(result.lastInsertRowid);
  }

  function ensureSupplierByName(row) {
    const normalized = normalizeSupplier({
      name: row.supplier || row.name,
      phone: row.phone,
      address: row.address,
      balance: row.openingBalance,
      notes: row.notes,
    });
    if (!normalized.name) return null;
    const existing = db.prepare('SELECT id FROM suppliers WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(normalized.name);
    if (existing) return Number(existing.id);
    const result = db.prepare('INSERT INTO suppliers (name, phone, address, balance, notes, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(normalized.name, normalized.phone, normalized.address, normalized.balance, normalized.notes);
    return Number(result.lastInsertRowid);
  }

  return function importProductsRows(rows, actor) {
    const summary = createImportSummary();
    const tx = db.transaction(() => {
      rows.forEach((row, index) => {
        try {
          const name = normalizeImportText(row.name, 160);
          if (!name) {
            summary.skipped += 1;
            summary.errors.push({ row: index + 1, error: 'اسم الصنف مطلوب' });
            return;
          }
          const payload = normalizeIncomingProduct({
            name,
            barcode: normalizeImportText(row.barcode, 120),
            categoryId: ensureCategoryByName(row.category),
            supplierId: ensureSupplierByName({ supplier: row.supplier, phone: row.supplierPhone, address: row.supplierAddress, notes: row.supplierNotes }),
            costPrice: normalizeImportNumber(row.costPrice),
            retailPrice: normalizeImportNumber(row.retailPrice),
            wholesalePrice: normalizeImportNumber(row.wholesalePrice),
            minStock: normalizeImportNumber(row.minStock),
            notes: normalizeImportText(row.notes, 2000),
            baseUnit: normalizeImportText(row.baseUnit, 80) || 'قطعة',
            units: [
              {
                name: normalizeImportText(row.baseUnit, 80) || 'قطعة',
                multiplier: 1,
                barcode: normalizeImportText(row.barcode, 120),
                isBaseUnit: true,
                isSaleUnit: true,
                isPurchaseUnit: !(normalizeImportText(row.purchaseUnit, 80)),
              },
              ...(normalizeImportText(row.purchaseUnit, 80) ? [{
                name: normalizeImportText(row.purchaseUnit, 80),
                multiplier: Math.max(1, normalizeImportNumber(row.extraUnitMultiplier || row.purchaseUnitMultiplier || 1, 1)),
                barcode: normalizeImportText(row.extraUnitBarcode || row.purchaseUnitBarcode, 120),
                isBaseUnit: false,
                isSaleUnit: false,
                isPurchaseUnit: true,
              }] : []),
              ...(normalizeImportText(row.extraUnitName, 80) ? [{
                name: normalizeImportText(row.extraUnitName, 80),
                multiplier: Math.max(1, normalizeImportNumber(row.extraUnitMultiplier, 1)),
                barcode: normalizeImportText(row.extraUnitBarcode, 120),
                isBaseUnit: false,
                isSaleUnit: false,
                isPurchaseUnit: false,
              }] : []),
            ],
          });
          const existing = payload.barcode
            ? db.prepare("SELECT id FROM products WHERE lower(COALESCE(barcode, '')) = lower(?) AND is_active = 1 LIMIT 1").get(payload.barcode)
            : db.prepare('SELECT id FROM products WHERE lower(name) = lower(?) AND is_active = 1 LIMIT 1').get(payload.name);
          if (existing) {
            db.prepare(`
              UPDATE products
              SET name = ?, barcode = ?, category_id = ?, supplier_id = ?, price = ?, cost = ?, cost_price = ?, retail_price = ?, wholesale_price = ?, min_stock_qty = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(payload.name, payload.barcode || null, payload.categoryId, payload.supplierId, payload.retailPrice, payload.costPrice, payload.costPrice, payload.retailPrice, payload.wholesalePrice, payload.minStock, payload.notes, Number(existing.id));
            replaceProductRelations(Number(existing.id), payload);
            summary.updated += 1;
            return;
          }
          const result = db.prepare(`
            INSERT INTO products (name, barcode, category_id, supplier_id, price, cost, stock, cost_price, retail_price, wholesale_price, stock_qty, min_stock_qty, notes)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?)
          `).run(payload.name, payload.barcode || null, payload.categoryId, payload.supplierId, payload.retailPrice, payload.costPrice, payload.costPrice, payload.retailPrice, payload.wholesalePrice, payload.minStock, payload.notes);
          replaceProductRelations(Number(result.lastInsertRowid), payload);
          summary.created += 1;
        } catch (error) {
          summary.skipped += 1;
          summary.errors.push({ row: index + 1, error: error && error.message ? error.message : 'تعذر استيراد الصنف' });
        }
      });
      persistRelationalState();
    });
    tx();
    addAuditLog('استيراد أصناف', `تم استيراد الأصناف بواسطة ${actor.username} (جديد ${summary.created} / محدث ${summary.updated} / متخطى ${summary.skipped})`, actor.id);
    return { ok: true, summary, products: relationalProducts(), categories: relationalCategories(), suppliers: relationalSuppliers() };
  };
}

module.exports = {
  createProductsImporter,
};
