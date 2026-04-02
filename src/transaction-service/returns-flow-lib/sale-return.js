function handleSaleReturn({
  db,
  relationalSales,
  hasOpenShiftForUser,
  splitSaleReturnSources,
  updateCustomerStoreCredit,
  addCustomerLedgerEntry,
  addTreasuryTransaction,
  user,
  invoiceId,
  normalizedItems,
  settlementMode,
  refundMethod,
  note,
  scope,
}) {
  const sale = relationalSales().find((entry) => Number(entry.id) === invoiceId);
  const branchId = scope.branchId || (sale && sale.branchId ? Number(sale.branchId) : null);
  const locationId = scope.locationId || (sale && sale.locationId ? Number(sale.locationId) : null);
  if (!sale) throw new Error('Sale not found');
  if ((sale.status || 'posted') !== 'posted') throw new Error('Returns are allowed only for posted sales');
  if (settlementMode === 'store_credit' && !sale.customerId) throw new Error('Store credit is available only for customer sales');
  if (settlementMode === 'refund' && refundMethod === 'cash' && !hasOpenShiftForUser(user.id) && !['admin', 'super_admin'].includes(String(user.role || ''))) {
    throw new Error('Open cashier shift is required for cash sale returns');
  }

  const referenceNote = `مرتجع بيع ${sale.docNo || sale.id}`;
  const insertedReturnIds = [];
  let total = 0;

  for (const entry of normalizedItems) {
    const qty = Number(entry.qty || 0);
    const productId = Number(entry.productId || 0);
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) throw new Error('Product not found');
    const item = (sale.items || []).find((saleEntry) => Number(saleEntry.productId || 0) === productId);
    if (!item) throw new Error('Sale item not found');

    const returnedQty = db.prepare('SELECT COALESCE(SUM(qty), 0) AS qty FROM returns WHERE return_type = ? AND invoice_id = ? AND product_id = ?').get('sale', invoiceId, productId).qty || 0;
    if (qty > (Number(item.qty || 0) - Number(returnedQty || 0))) throw new Error('Return quantity exceeds remaining sold quantity');

    const lineTotal = qty * Number(item.price || 0);
    total += lineTotal;
    const result = db.prepare(`
      INSERT INTO returns (
        return_type, invoice_id, product_id, product_name, qty, total,
        settlement_mode, refund_method, exchange_sale_id, note, branch_id, location_id, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sale',
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
    const restoreQty = qty * Number(item.unitMultiplier || 1);
    const afterQty = beforeQty + restoreQty;
    db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, productId);
    db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
      VALUES (?, 'sale_return', ?, ?, ?, 'manual', ?, 'sale_return', ?, ?)
    `).run(productId, restoreQty, beforeQty, afterQty, referenceNote, currentReturnId, user.id);
  }

  const returnId = insertedReturnIds[0] || null;
  if (sale.customerId && settlementMode === 'store_credit') {
    const customerRow = db.prepare('SELECT store_credit_balance FROM customers WHERE id = ?').get(Number(sale.customerId));
    const nextStoreCredit = Number(customerRow?.store_credit_balance || 0) + total;
    db.prepare('UPDATE customers SET store_credit_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextStoreCredit, Number(sale.customerId));
    addCustomerLedgerEntry(Number(sale.customerId), 'store_credit_issue', -total, `${referenceNote} - رصيد متجر`, 'sale_return', returnId, user.id);
  } else {
    const { storeCreditPortion, remainingPortion } = splitSaleReturnSources(sale, total);
    if (storeCreditPortion > 0 && sale.customerId) {
      updateCustomerStoreCredit(Number(sale.customerId), storeCreditPortion);
      addCustomerLedgerEntry(Number(sale.customerId), 'sale_return_store_credit_restore', -storeCreditPortion, `${referenceNote} - إعادة رصيد متجر`, 'sale_return', returnId, user.id);
    }
    if (remainingPortion > 0) {
      if (sale.paymentType === 'credit' && sale.customerId) {
        const currentBalance = Number(db.prepare('SELECT balance FROM customers WHERE id = ?').get(Number(sale.customerId))?.balance || 0);
        const appliedAmount = Math.min(remainingPortion, currentBalance > 0 ? currentBalance : remainingPortion);
        if (appliedAmount > 0) addCustomerLedgerEntry(Number(sale.customerId), 'sale_return_credit', -appliedAmount, referenceNote, 'sale_return', returnId, user.id);
      } else if (refundMethod === 'cash') {
        addTreasuryTransaction('sale_return', -remainingPortion, referenceNote, 'sale_return', returnId, user.id, branchId, locationId);
      }
    }
  }

  return {
    total,
    returnId,
    insertedReturnIds,
    docNoPrefix: 'SR',
    branchId,
    locationId,
    referenceNote,
  };
}

module.exports = { handleSaleReturn };
