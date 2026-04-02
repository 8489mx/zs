const { computeInvoiceTotals } = require('../tax-utils');
const { createCustomerStoreCreditService } = require('../customer-store-credit-service');

function createSaleUpdateMutationHandlers(deps, shared) {
  const {
    db,
    assertManagerPin,
    assertSaleMutationAllowed,
    normalizeIncomingSale,
    userHasPermission,
    addCustomerLedgerEntry,
    addTreasuryTransaction,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalSales,
  } = deps;

  const {
    snapshotInvoice,
    writeSensitiveAudit,
    isCashPayment,
    normalizeEditReason,
  } = shared;

  const { updateCustomerStoreCredit } = createCustomerStoreCreditService({ db });

  function updateSaleRecord(saleId, payload, user, managerPin) {
    return db.transaction(() => {
      assertManagerPin(managerPin);
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'cancelled') throw new Error('Cancelled sale cannot be edited');
      assertSaleMutationAllowed(sale, 'edited');

      const normalized = normalizeIncomingSale(payload || {});
      const editReason = normalizeEditReason((payload || {}).editReason || '', 'Sale update');
      if (!normalized.items.length) throw new Error('Sale must include at least one item');
      if (!(normalized.discount >= 0)) throw new Error('Discount cannot be negative');

      const originalItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC').all(saleId);
      const originalByProduct = new Map();
      for (const item of originalItems) {
        if (!item.product_id) continue;
        originalByProduct.set(Number(item.product_id), {
          qty: Number(item.qty || 0),
          unitMultiplier: Number(item.unit_multiplier || 1),
          price: Number(item.unit_price || 0),
          priceType: item.price_type || 'retail',
        });
      }

      let subtotal = 0;
      const preparedItems = normalized.items.map((item) => {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId);
        if (!product) throw new Error('Product not found');
        const requestedQty = Number(item.qty || 0);
        const requestedMultiplier = Number(item.unitMultiplier || 1) || 1;
        if (!(requestedMultiplier > 0)) throw new Error('Sale unit multiplier must be greater than zero');
        const requiredQty = requestedQty * requestedMultiplier;
        const original = originalByProduct.get(Number(item.productId));
        const availableQty = Number(product.stock_qty || 0) + (original ? Number(original.qty || 0) * Number(original.unitMultiplier || 1) : 0);
        if (availableQty < requiredQty) throw new Error(`Insufficient stock for ${product.name}`);
        const requestedPrice = Number(item.price || 0);
        if (!(requestedPrice >= 0)) throw new Error(`Item price cannot be negative for ${product.name}`);
        const expectedUnitPrice = (item.priceType === 'wholesale'
          ? Number(product.wholesale_price || 0)
          : Number(product.retail_price || 0)) * requestedMultiplier;
        const originalPrice = original ? Number(original.price || expectedUnitPrice) : expectedUnitPrice;
        if (Math.abs(requestedPrice - originalPrice) > 0.0001 && !userHasPermission(user, 'canEditPrice')) {
          throw new Error(`Price edit is not allowed for ${product.name}`);
        }
        const lineTotal = requestedQty * requestedPrice;
        subtotal += lineTotal;
        return {
          product,
          qty: requestedQty,
          unitName: item.unitName || 'قطعة',
          unitMultiplier: requestedMultiplier,
          unitPrice: requestedPrice,
          lineTotal,
          priceType: item.priceType || 'retail',
          requiredQty,
        };
      });

      if (Number(normalized.discount || 0) > subtotal) throw new Error('Discount cannot exceed subtotal');
      if (!(Number(normalized.paidAmount || 0) >= 0)) throw new Error('Paid amount cannot be negative');

      const saleTotals = computeInvoiceTotals({
        subtotal,
        discount: Number(normalized.discount || 0),
        taxRate: normalized.taxRate != null ? normalized.taxRate : sale.tax_rate,
        pricesIncludeTax: normalized.pricesIncludeTax != null ? normalized.pricesIncludeTax : Number(sale.prices_include_tax || 0) === 1,
      });
      const total = saleTotals.total;
      const customer = normalized.customerId ? db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(normalized.customerId) : null;
      if (normalized.customerId && !customer) throw new Error('Customer not found');
      if (normalized.paymentType === 'credit' && !customer) throw new Error('Credit sale requires a customer');

      const restoredStoreCreditForSameCustomer = Number(sale.customer_id || 0) === Number(normalized.customerId || 0)
        ? Number(sale.store_credit_used || 0)
        : 0;
      const availableStoreCredit = customer ? Number(customer.store_credit_balance || 0) + restoredStoreCreditForSameCustomer : 0;
      const requestedStoreCredit = Math.max(0, Number(normalized.storeCreditUsed || 0));
      if (requestedStoreCredit > total + 0.0001) throw new Error('Store credit cannot exceed invoice total');
      if (requestedStoreCredit > 0 && !customer) throw new Error('Store credit requires a customer');
      if (requestedStoreCredit > availableStoreCredit + 0.0001) throw new Error('Store credit exceeds available balance');
      const collectibleTotal = Math.max(0, Number((total - requestedStoreCredit).toFixed(2)));
      const paidAmount = normalized.paymentType === 'credit' ? 0 : Math.max(Number(normalized.paidAmount || collectibleTotal), collectibleTotal);
      if (normalized.paymentType === 'credit' && customer) {
        const originalCreditForSameCustomer = (sale.payment_type === 'credit' && Number(sale.customer_id || 0) === Number(customer.id || 0))
          ? Math.max(0, Number(sale.total || 0) - Number(sale.store_credit_used || 0))
          : 0;
        const projectedBalance = Number(customer.balance || 0) - originalCreditForSameCustomer + collectibleTotal;
        if (Number(customer.credit_limit || 0) > 0 && projectedBalance > Number(customer.credit_limit || 0)) {
          throw new Error('Customer credit limit exceeded');
        }
      }

      for (const item of originalItems) {
        if (!item.product_id) continue;
        const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
        if (!product) continue;
        const beforeQty = Number(product.stock_qty || 0);
        const restoreQty = Number(item.qty || 0) * Number(item.unit_multiplier || 1);
        const afterQty = beforeQty + restoreQty;
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, item.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, 'sale_edit_restore', ?, ?, ?, 'sale_edit_restore', ?, 'sale', ?, ?)
        `).run(item.product_id, restoreQty, beforeQty, afterQty, `Edit restore ${sale.doc_no || sale.id}`, saleId, user.id);
      }

      const originalStoreCreditUsed = Number(sale.store_credit_used || 0);
      const originalCollectibleTotal = Math.max(0, Number(sale.total || 0) - originalStoreCreditUsed);
      if (originalStoreCreditUsed > 0 && sale.customer_id) {
        updateCustomerStoreCredit(sale.customer_id, originalStoreCreditUsed);
      }
      if (sale.payment_type === 'credit' && sale.customer_id) {
        const currentBalance = Number(db.prepare('SELECT balance FROM customers WHERE id = ?').get(sale.customer_id)?.balance || 0);
        const appliedAmount = Math.min(originalCollectibleTotal, currentBalance > 0 ? currentBalance : originalCollectibleTotal);
        if (appliedAmount > 0) addCustomerLedgerEntry(sale.customer_id, 'sale_edit_restore', -appliedAmount, `عكس فاتورة بيع ${sale.doc_no || sale.id} قبل التعديل`, 'sale', saleId, user.id);
      } else if (originalCollectibleTotal > 0 && isCashPayment(sale.payment_type, sale.payment_channel)) {
        addTreasuryTransaction('sale_edit_restore', -originalCollectibleTotal, `عكس فاتورة بيع ${sale.doc_no || sale.id} قبل التعديل`, 'sale', saleId, user.id);
      }

      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
      for (const item of preparedItems) {
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, line_total, unit_name, unit_multiplier, cost_price, price_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          saleId,
          item.product.id,
          item.product.name,
          item.qty,
          item.unitPrice,
          item.lineTotal,
          item.unitName,
          item.unitMultiplier,
          Number(item.product.cost_price || 0) * item.unitMultiplier,
          item.priceType
        );
        const currentRow = db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(item.product.id);
        const actualBeforeQty = Number(currentRow ? currentRow.stock_qty : 0);
        const afterQty = actualBeforeQty - item.requiredQty;
        db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, item.product.id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, created_by)
          VALUES (?, 'sale_edit_apply', ?, ?, ?, 'sale_edit_apply', ?, 'sale', ?, ?)
        `).run(item.product.id, -item.requiredQty, actualBeforeQty, afterQty, `Edit apply ${sale.doc_no || sale.id}`, saleId, user.id);
      }

      if (requestedStoreCredit > 0 && customer) {
        updateCustomerStoreCredit(customer.id, -requestedStoreCredit);
      }
      if (normalized.paymentType === 'credit' && customer) {
        if (collectibleTotal > 0) addCustomerLedgerEntry(customer.id, 'sale_edit_apply', collectibleTotal, `تطبيق تعديل فاتورة بيع ${sale.doc_no || sale.id}`, 'sale', saleId, user.id);
      } else if (collectibleTotal > 0 && isCashPayment(normalized.paymentType, normalized.paymentChannel)) {
        addTreasuryTransaction('sale_edit_apply', collectibleTotal, `تطبيق تعديل فاتورة بيع ${sale.doc_no || sale.id}`, 'sale', saleId, user.id);
      }

      db.prepare(`
        UPDATE sales
        SET customer_id = ?, customer_name = ?, payment_type = ?, payment_channel = ?, subtotal = ?, discount = ?, tax_rate = ?, tax_amount = ?, prices_include_tax = ?, total = ?, paid_amount = ?, store_credit_used = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        normalized.customerId,
        customer ? customer.name : 'عميل نقدي',
        normalized.paymentType,
        normalized.paymentChannel,
        subtotal,
        Number(normalized.discount || 0),
        saleTotals.taxRate,
        saleTotals.taxAmount,
        saleTotals.pricesIncludeTax ? 1 : 0,
        total,
        paidAmount,
        requestedStoreCredit,
        normalized.note || '',
        saleId
      );

      writeSensitiveAudit('تعديل فاتورة بيع', user, {
        reason: editReason,
        before: snapshotInvoice('sale', sale, originalItems),
        after: snapshotInvoice(
          'sale',
          db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId),
          db.prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC').all(saleId)
        ),
      });
      persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
      return relationalSales().find((entry) => Number(entry.id) === Number(saleId));
    })();
  }

  return { updateSaleRecord };
}

module.exports = { createSaleUpdateMutationHandlers };
