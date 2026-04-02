const { createCustomerStoreCreditService } = require('../customer-store-credit-service');

function createCancelMutationHandlers(deps, shared) {
  const {
    db,
    assertManagerPin,
    assertSaleMutationAllowed,
    assertPurchaseMutationAllowed,
    addCustomerLedgerEntry,
    addSupplierLedgerEntry,
    addTreasuryTransaction,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalSales,
    relationalPurchases,
  } = deps;

  const {
    snapshotInvoice,
    writeSensitiveAudit,
    isCashPayment,
    normalizeCancellationReason,
  } = shared;

  const { updateCustomerStoreCredit } = createCustomerStoreCreditService({ db });

  function cancelSaleRecord(saleId, reason, user, managerPin) {
    return db.transaction(() => {
      assertManagerPin(managerPin);
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'cancelled') throw new Error('Sale already cancelled');
      assertSaleMutationAllowed(sale, 'cancelled');

      const cancellationReason = normalizeCancellationReason(reason, 'Sale cancellation');
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC').all(saleId);

      for (const item of items) {
        if (!item.product_id) continue;
        const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
        if (!product) continue;
        const beforeQty = Number(product.stock_qty || 0);
        const restoreQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const afterQty = beforeQty + restoreQty;
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, item.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, 'sale_cancel', ?, ?, ?, 'sale_cancel', ?, 'sale', ?, ?)
        `).run(item.product_id, restoreQty, beforeQty, afterQty, `Cancel sale ${sale.doc_no || sale.id}`, saleId, user.id);
      }

      const originalStoreCreditUsed = Number(sale.store_credit_used || 0);
      const originalCollectibleTotal = Math.max(0, Number(sale.total || 0) - originalStoreCreditUsed);
      if (originalStoreCreditUsed > 0 && sale.customer_id) {
        updateCustomerStoreCredit(sale.customer_id, originalStoreCreditUsed);
      }
      if (sale.payment_type === 'credit' && sale.customer_id) {
        const currentBalance = Number(db.prepare('SELECT balance FROM customers WHERE id = ?').get(sale.customer_id)?.balance || 0);
        const appliedAmount = Math.min(originalCollectibleTotal, currentBalance > 0 ? currentBalance : originalCollectibleTotal);
        if (appliedAmount > 0) addCustomerLedgerEntry(sale.customer_id, 'sale_cancel', -appliedAmount, `إلغاء فاتورة بيع ${sale.doc_no || sale.id}`, 'sale', saleId, user.id);
      } else if (originalCollectibleTotal > 0 && isCashPayment(sale.payment_type, sale.payment_channel)) {
        addTreasuryTransaction('sale_cancel', -originalCollectibleTotal, `إلغاء فاتورة بيع ${sale.doc_no || sale.id}`, 'sale', saleId, user.id);
      }

      db.prepare("UPDATE sales SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, cancel_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(user.id, cancellationReason, saleId);

      writeSensitiveAudit('إلغاء فاتورة بيع', user, {
        reason: cancellationReason,
        before: snapshotInvoice('sale', sale, items),
        after: { id: Number(saleId), status: 'cancelled', cancelReason: cancellationReason },
      });
      persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
      return relationalSales().find((entry) => Number(entry.id) === Number(saleId));
    })();
  }

  function cancelPurchaseRecord(purchaseId, reason, user, managerPin) {
    return db.transaction(() => {
      assertManagerPin(managerPin);
      const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
      if (!purchase) throw new Error('Purchase not found');
      if (purchase.status === 'cancelled') throw new Error('Purchase already cancelled');
      assertPurchaseMutationAllowed(purchase, 'cancelled');

      const cancellationReason = normalizeCancellationReason(reason, 'Purchase cancellation');
      const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC').all(purchaseId);

      for (const item of items) {
        if (!item.product_id) continue;
        const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
        if (!product) continue;
        const beforeQty = Number(product.stock_qty || 0);
        const decreaseQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const afterQty = beforeQty - decreaseQty;
        if (afterQty < 0) throw new Error(`Cannot cancel purchase because stock would go negative for product #${item.product_id}`);
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, item.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, 'purchase_cancel', ?, ?, ?, 'purchase_cancel', ?, 'purchase', ?, ?)
        `).run(item.product_id, -decreaseQty, beforeQty, afterQty, `Cancel purchase ${purchase.doc_no || purchase.id}`, purchaseId, user.id);
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        const currentBalance = Number(db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(purchase.supplier_id)?.balance || 0);
        const appliedAmount = Math.min(Number(purchase.total || 0), currentBalance > 0 ? currentBalance : Number(purchase.total || 0));
        addSupplierLedgerEntry(purchase.supplier_id, 'purchase_cancel', -appliedAmount, `إلغاء فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, user.id);
      } else {
        addTreasuryTransaction('purchase_cancel', Number(purchase.total || 0), `إلغاء فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, user.id);
      }

      db.prepare("UPDATE purchases SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, cancel_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(user.id, cancellationReason, purchaseId);

      writeSensitiveAudit('إلغاء فاتورة شراء', user, {
        reason: cancellationReason,
        before: snapshotInvoice('purchase', purchase, items),
        after: { id: Number(purchaseId), status: 'cancelled', cancelReason: cancellationReason },
      });
      persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
      return relationalPurchases().find((entry) => Number(entry.id) === Number(purchaseId));
    })();
  }

  return {
    cancelSaleRecord,
    cancelPurchaseRecord,
  };
}

module.exports = { createCancelMutationHandlers };
