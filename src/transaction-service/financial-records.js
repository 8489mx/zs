const { computeInvoiceTotals } = require('../tax-utils');

function createFinancialRecordHandlers(deps) {
  const {
    db,
    userHasPermission,
    makeDocNo,
    addSupplierLedgerEntry,
    addCustomerLedgerEntry,
    addTreasuryTransaction,
    addAuditLog,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalPurchases,
    resolveBranchLocationScope,
  } = deps;

    function createPurchaseRecord(payload, user) {
      const tx = db.transaction(() => {
        const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: null, locationId: null };
        const supplierId = Number(payload.supplierId || 0);
        if (supplierId <= 0) throw new Error('Supplier is required');
        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1').get(supplierId);
        if (!supplier) throw new Error('Supplier not found');
        const items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length) throw new Error('Purchase must include at least one item');
        const normalizedItems = items.map((item) => {
          const productId = Number(item.productId || 0);
          const qty = Number(item.qty || 0);
          const cost = Number(item.cost || 0);
          const unitMultiplier = Number(item.unitMultiplier || 1) || 1;
          if (productId <= 0) throw new Error('Each purchase item requires a product');
          if (!(qty > 0)) throw new Error('Purchase item quantity must be greater than zero');
          if (!(cost >= 0)) throw new Error('Purchase item cost cannot be negative');
          if (!(unitMultiplier > 0)) throw new Error('Purchase unit multiplier must be greater than zero');
          const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
          if (!product) throw new Error('Product not found');
          return {
            product,
            productId,
            name: String(item.name || product.name || '').trim(),
            qty,
            cost,
            unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
            unitMultiplier,
            total: qty * cost
          };
        });
        const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
        const discount = Number(payload.discount || 0);
        if (!userHasPermission(user, 'canDiscount') && Math.abs(discount) > 0.0001) {
          throw new Error('Discount change is not allowed');
        }
        if (discount < 0) throw new Error('Discount cannot be negative');
        if (discount > subtotal) throw new Error('Discount cannot exceed subtotal');
        const purchaseTotals = computeInvoiceTotals({
          subtotal,
          discount,
          taxRate: payload.taxRate,
          pricesIncludeTax: payload.pricesIncludeTax,
        });
        const taxRate = purchaseTotals.taxRate;
        const pricesIncludeTax = purchaseTotals.pricesIncludeTax;
        const taxAmount = purchaseTotals.taxAmount;
        const total = purchaseTotals.total;
        const paymentType = payload.paymentType === 'credit' ? 'credit' : 'cash';
        const purchaseInsert = db.prepare(`
          INSERT INTO purchases (supplier_id, payment_type, subtotal, discount, tax_rate, tax_amount, prices_include_tax, total, note, status, branch_id, location_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?)
        `).run(supplierId, paymentType, subtotal, discount, taxRate, taxAmount, pricesIncludeTax ? 1 : 0, total, String(payload.note || '').trim(), scope.branchId, scope.locationId, user.id);
        const purchaseId = Number(purchaseInsert.lastInsertRowid);
        const docNo = makeDocNo('PUR', purchaseId);
        db.prepare('UPDATE purchases SET doc_no = ? WHERE id = ?').run(docNo, purchaseId);
        for (const item of normalizedItems) {
          db.prepare(`
            INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, unit_cost, line_total, unit_name, unit_multiplier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(purchaseId, item.productId, item.name, item.qty, item.cost, item.total, item.unitName, item.unitMultiplier);
          const beforeQty = Number(item.product.stock_qty || 0);
          const increaseQty = Number(item.qty || 0) * Number(item.unitMultiplier || 1);
          const afterQty = beforeQty + increaseQty;
          db.prepare('UPDATE products SET stock_qty = ?, stock = ?, cost_price = ?, cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(afterQty, afterQty, item.cost, item.cost, item.productId);
          db.prepare(`
            INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, branch_id, location_id, created_by)
            VALUES (?, 'purchase', ?, ?, ?, 'manual', ?, 'purchase', ?, ?, ?, ?)
          `).run(item.productId, increaseQty, beforeQty, afterQty, `فاتورة شراء ${docNo}`, purchaseId, scope.branchId, scope.locationId, user.id);
        }
        if (paymentType === 'credit') {
          addSupplierLedgerEntry(supplierId, 'purchase_credit', total, `فاتورة شراء ${docNo}`, 'purchase', purchaseId, user.id);
        } else {
          addTreasuryTransaction('purchase', -total, `فاتورة شراء ${docNo}`, 'purchase', purchaseId, user.id, scope.branchId, scope.locationId);
        }
        addAuditLog('شراء', `تم تسجيل ${docNo} بقيمة ${total}`, user.id);
        persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
        return relationalPurchases().find((purchase) => Number(purchase.id) === purchaseId);
      });
      return tx();
    }

    function createExpenseRecord(payload, user) {
      const tx = db.transaction(() => {
        const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: null, locationId: null };
        const title = String(payload.title || '').trim();
        const amount = Number(payload.amount || 0);
        const note = String(payload.note || '').trim();
        const expenseDate = payload.date || new Date().toISOString();
        if (!title) throw new Error('Expense title is required');
        if (!(amount > 0)) throw new Error('Expense amount must be greater than zero');
        const result = db.prepare('INSERT INTO expenses (title, amount, expense_date, note, branch_id, location_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(title, amount, expenseDate, note, scope.branchId, scope.locationId, user.id);
        addTreasuryTransaction('expense', -amount, title, 'expense', Number(result.lastInsertRowid), user.id, scope.branchId, scope.locationId);
        addAuditLog('مصروف', `تم تسجيل مصروف ${title} بقيمة ${amount}`, user.id);
        persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
        return { ok: true };
      });
      return tx();
    }

    function createSupplierPaymentRecord(payload, user) {
      const tx = db.transaction(() => {
        const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: null, locationId: null };
        const supplierId = Number(payload.supplierId || 0);
        const amount = Number(payload.amount || 0);
        const note = String(payload.note || '').trim();
        if (supplierId <= 0) throw new Error('Supplier is required');
        if (!(amount > 0)) throw new Error('Amount must be greater than zero');
        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1').get(supplierId);
        if (!supplier) throw new Error('Supplier not found');
        const currentBalance = Number(supplier.balance || 0);
        if (!(currentBalance > 0)) throw new Error('Supplier has no outstanding balance');
        if (amount - currentBalance > 0.0001) throw new Error('Supplier payment cannot exceed outstanding balance');
        const result = db.prepare('INSERT INTO supplier_payments (supplier_id, amount, note, branch_id, location_id, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(supplierId, amount, note, scope.branchId, scope.locationId, user.id);
        const paymentId = Number(result.lastInsertRowid);
        const docNo = makeDocNo('PO', paymentId);
        db.prepare('UPDATE supplier_payments SET doc_no = ? WHERE id = ?').run(docNo, paymentId);
        addSupplierLedgerEntry(supplierId, 'supplier_payment', -amount, `دفع إلى ${supplier.name}${note ? ' - ' + note : ''}`, 'supplier_payment', paymentId, user.id);
        addTreasuryTransaction('supplier_payment', -amount, `دفع إلى ${supplier.name}`, 'supplier_payment', paymentId, user.id, scope.branchId, scope.locationId);
        addAuditLog('دفع لمورد', `تم تسجيل ${docNo} بقيمة ${amount}`, user.id);
        persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
        return { ok: true };
      });
      return tx();
    }
    function createCustomerPayment(payload, user) {
      const tx = db.transaction(() => {
        const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: null, locationId: null };
        const customerId = Number(payload.customerId || 0);
        const amount = Number(payload.amount || 0);
        const note = String(payload.note || '').trim();
        if (customerId <= 0) throw new Error('Customer is required');
        if (amount <= 0) throw new Error('Amount must be greater than zero');
        const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(customerId);
        if (!customer) throw new Error('Customer not found');
        const currentBalance = Number(customer.balance || 0);
        if (!(currentBalance > 0)) throw new Error('Customer has no outstanding balance');
        if (amount - currentBalance > 0.0001) throw new Error('Customer payment cannot exceed outstanding balance');
        const paymentResult = db.prepare('INSERT INTO customer_payments (customer_id, amount, note, branch_id, location_id, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(customerId, amount, note, scope.branchId, scope.locationId, user.id);
        const paymentId = Number(paymentResult.lastInsertRowid);
        addCustomerLedgerEntry(customerId, 'customer_payment', -amount, `تحصيل من العميل ${customer.name}${note ? ' - ' + note : ''}`, 'customer_payment', paymentId, user.id);
        addTreasuryTransaction('customer_payment', amount, `تحصيل من العميل ${customer.name}${note ? ' - ' + note : ''}`, 'customer_payment', paymentId, user.id, scope.branchId, scope.locationId);
        addAuditLog('تحصيل عميل', `تم تحصيل ${amount} من العميل ${customer.name}`, user.id);
        persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
        return { ok: true };
      });
      return tx();
    }
  return {
    createPurchaseRecord,
    createExpenseRecord,
    createSupplierPaymentRecord,
    createCustomerPayment,
  };
}

module.exports = { createFinancialRecordHandlers };
