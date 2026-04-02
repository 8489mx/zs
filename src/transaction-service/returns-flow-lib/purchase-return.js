function handlePurchaseReturn({
  db,
  relationalPurchases,
  addSupplierLedgerEntry,
  addTreasuryTransaction,
  user,
  invoiceId,
  normalizedItems,
  settlementMode,
  refundMethod,
  note,
  scope,
}) {
  const purchase = relationalPurchases().find((entry) => Number(entry.id) === invoiceId);
  const branchId = scope.branchId || (purchase && purchase.branchId ? Number(purchase.branchId) : null);
  const locationId = scope.locationId || (purchase && purchase.locationId ? Number(purchase.locationId) : null);
  if (!purchase) throw new Error('Purchase not found');
  if ((purchase.status || 'posted') !== 'posted') throw new Error('Returns are allowed only for posted purchases');
  if (settlementMode !== 'refund') throw new Error('Purchase returns support refund settlement only');

  const referenceNote = `مرتجع شراء ${purchase.docNo || purchase.id}`;
  const insertedReturnIds = [];
  let total = 0;

  for (const entry of normalizedItems) {
    const qty = Number(entry.qty || 0);
    const productId = Number(entry.productId || 0);
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) throw new Error('Product not found');
    const item = (purchase.items || []).find((purchaseEntry) => Number(purchaseEntry.productId || 0) === productId);
    if (!item) throw new Error('Purchase item not found');

    const returnedQty = db.prepare('SELECT COALESCE(SUM(qty), 0) AS qty FROM returns WHERE return_type = ? AND invoice_id = ? AND product_id = ?').get('purchase', invoiceId, productId).qty || 0;
    if (qty > (Number(item.qty || 0) - Number(returnedQty || 0))) throw new Error('Return quantity exceeds remaining purchased quantity');

    const lineTotal = qty * Number(item.cost || 0);
    total += lineTotal;
    const result = db.prepare(`
      INSERT INTO returns (
        return_type, invoice_id, product_id, product_name, qty, total,
        settlement_mode, refund_method, exchange_sale_id, note, branch_id, location_id, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'purchase',
      invoiceId,
      productId,
      String(entry.productName || product.name || item.name || ''),
      qty,
      lineTotal,
      settlementMode,
      refundMethod,
      null,
      note,
      branchId,
      locationId,
      user.id,
    );

    const currentReturnId = Number(result.lastInsertRowid);
    insertedReturnIds.push(currentReturnId);
    const beforeQty = Number(product.stock_qty || 0);
    const decreaseQty = qty * Number(item.unitMultiplier || 1);
    if (beforeQty < decreaseQty) throw new Error('Current stock is not enough for purchase return');
    const afterQty = beforeQty - decreaseQty;
    db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, productId);
    db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
      VALUES (?, 'purchase_return', ?, ?, ?, 'manual', ?, 'purchase_return', ?, ?)
    `).run(productId, -decreaseQty, beforeQty, afterQty, referenceNote, currentReturnId, user.id);
  }

  const returnId = insertedReturnIds[0] || null;
  if (purchase.paymentType === 'credit') {
    if (purchase.supplierId) {
      const currentBalance = Number(db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(Number(purchase.supplierId))?.balance || 0);
      const appliedAmount = Math.min(total, currentBalance > 0 ? currentBalance : total);
      if (appliedAmount > 0) addSupplierLedgerEntry(Number(purchase.supplierId), 'purchase_return_credit', -appliedAmount, referenceNote, 'purchase_return', returnId, user.id);
    }
  } else if (refundMethod === 'cash') {
    addTreasuryTransaction('purchase_return', total, referenceNote, 'purchase_return', returnId, user.id, branchId, locationId);
  }

  return {
    total,
    returnId,
    insertedReturnIds,
    docNoPrefix: 'PR',
    branchId,
    locationId,
    referenceNote,
  };
}

module.exports = { handlePurchaseReturn };
