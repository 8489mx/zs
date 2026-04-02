const { computeInvoiceTotals } = require('../tax-utils');

function createPurchaseUpdateMutationHandlers(deps, shared) {
  const {
    db,
    assertManagerPin,
    assertPurchaseMutationAllowed,
    userHasPermission,
    addSupplierLedgerEntry,
    addTreasuryTransaction,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalPurchases,
  } = deps;

  const {
    snapshotInvoice,
    writeSensitiveAudit,
    normalizeEditReason,
  } = shared;

  function updatePurchaseRecord(purchaseId, payload, user, managerPin) {
    return db.transaction(() => {
      assertManagerPin(managerPin);
      const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
      if (!purchase) throw new Error('Purchase not found');
      if (purchase.status === 'cancelled') throw new Error('Cancelled purchase cannot be edited');
      assertPurchaseMutationAllowed(purchase, 'edited');

      const editReason = normalizeEditReason((payload || {}).editReason || '', 'Purchase update');
      const supplierId = Number(payload.supplierId || 0);
      if (supplierId <= 0) throw new Error('Supplier is required');
      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1').get(supplierId);
      if (!supplier) throw new Error('Supplier not found');
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) throw new Error('Purchase must include at least one item');
      const originalItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC').all(purchaseId);

      for (const item of originalItems) {
        if (!item.product_id) continue;
        const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
        if (!product) continue;
        const decreaseQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        if (Number(product.stock_qty || 0) < decreaseQty) {
          throw new Error(`Cannot edit purchase because stock would go negative for product #${item.product_id}`);
        }
      }

      const normalizedItems = items.map((item) => {
        const productId = Number(item.productId || 0);
        const qty = Number(item.qty || 0);
        const cost = Number(item.cost || 0);
        const unitMultiplier = Number(item.unitMultiplier || 1) || 1;
        if (productId <= 0) throw new Error('Each purchase item requires a product');
        if (!(qty > 0)) throw new Error('Purchase item quantity must be greater than zero');
        if (!(cost >= 0)) throw new Error('Purchase item cost cannot be negative');
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
        if (!product) throw new Error('Product not found');
        const originalLine = originalItems.find((entry) => Number(entry.product_id) === productId);
        const originalCost = originalLine ? Number(originalLine.unit_cost || 0) : cost;
        if (Math.abs(cost - originalCost) > 0.0001 && !userHasPermission(user, 'canEditPrice')) {
          throw new Error(`Cost edit is not allowed for ${product.name}`);
        }
        return {
          product,
          productId,
          name: String(item.name || product.name || '').trim(),
          qty,
          cost,
          unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
          unitMultiplier,
          total: qty * cost,
        };
      });

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
      const discount = Number(payload.discount || 0);
      if (!userHasPermission(user, 'canDiscount') && Math.abs(discount - Number(purchase.discount || 0)) > 0.0001) {
        throw new Error('Discount change is not allowed');
      }
      if (discount < 0) throw new Error('Discount cannot be negative');
      if (discount > subtotal) throw new Error('Discount cannot exceed subtotal');
      const purchaseTotals = computeInvoiceTotals({
        subtotal,
        discount,
        taxRate: payload.taxRate != null ? payload.taxRate : purchase.tax_rate,
        pricesIncludeTax: payload.pricesIncludeTax != null ? payload.pricesIncludeTax : Number(purchase.prices_include_tax || 0) === 1,
      });
      const total = purchaseTotals.total;
      const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';

      for (const item of originalItems) {
        if (!item.product_id) continue;
        const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
        if (!product) continue;
        const beforeQty = Number(product.stock_qty || 0);
        const decreaseQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const afterQty = beforeQty - decreaseQty;
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, item.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, 'purchase_edit_restore', ?, ?, ?, 'purchase_edit_restore', ?, 'purchase', ?, ?)
        `).run(item.product_id, -decreaseQty, beforeQty, afterQty, `Edit restore ${purchase.doc_no || purchase.id}`, purchaseId, user.id);
      }

      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        const currentBalance = Number(db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(purchase.supplier_id)?.balance || 0);
        const appliedAmount = Math.min(Number(purchase.total || 0), currentBalance > 0 ? currentBalance : Number(purchase.total || 0));
        addSupplierLedgerEntry(purchase.supplier_id, 'purchase_edit_restore', -appliedAmount, `عكس فاتورة شراء ${purchase.doc_no || purchase.id} قبل التعديل`, 'purchase', purchaseId, user.id);
      } else {
        addTreasuryTransaction('purchase_edit_restore', Number(purchase.total || 0), `عكس فاتورة شراء ${purchase.doc_no || purchase.id} قبل التعديل`, 'purchase', purchaseId, user.id);
      }

      db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(purchaseId);
      for (const item of normalizedItems) {
        db.prepare(`
          INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, unit_cost, line_total, unit_name, unit_multiplier)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(purchaseId, item.productId, item.name, item.qty, item.cost, item.total, item.unitName, item.unitMultiplier);
        const currentRow = db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(item.productId);
        const beforeQty = Number(currentRow ? currentRow.stock_qty : 0);
        const increaseQty = Number(item.qty || 0) * Number(item.unitMultiplier || 1);
        const afterQty = beforeQty + increaseQty;
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, cost_price = ?, cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(afterQty, afterQty, item.cost, item.cost, item.productId);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, 'purchase_edit_apply', ?, ?, ?, 'purchase_edit_apply', ?, 'purchase', ?, ?)
        `).run(item.productId, increaseQty, beforeQty, afterQty, `Edit apply ${purchase.doc_no || purchase.id}`, purchaseId, user.id);
      }

      if (paymentType === 'credit') {
        addSupplierLedgerEntry(supplierId, 'purchase_edit_apply', total, `تطبيق تعديل فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, user.id);
      } else {
        addTreasuryTransaction('purchase_edit_apply', -total, `تطبيق تعديل فاتورة شراء ${purchase.doc_no || purchase.id}`, 'purchase', purchaseId, user.id);
      }

      db.prepare(`
        UPDATE purchases
        SET supplier_id = ?, payment_type = ?, subtotal = ?, discount = ?, tax_rate = ?, tax_amount = ?, prices_include_tax = ?, total = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        supplierId,
        paymentType,
        subtotal,
        discount,
        purchaseTotals.taxRate,
        purchaseTotals.taxAmount,
        purchaseTotals.pricesIncludeTax ? 1 : 0,
        total,
        String(payload.note || '').trim(),
        purchaseId
      );

      writeSensitiveAudit('تعديل فاتورة شراء', user, {
        reason: editReason,
        before: snapshotInvoice('purchase', purchase, originalItems),
        after: snapshotInvoice(
          'purchase',
          db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId),
          db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC').all(purchaseId)
        ),
      });
      persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
      return relationalPurchases().find((entry) => Number(entry.id) === Number(purchaseId));
    })();
  }

  return { updatePurchaseRecord };
}

module.exports = { createPurchaseUpdateMutationHandlers };
