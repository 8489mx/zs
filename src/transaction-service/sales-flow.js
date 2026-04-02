const { computeInvoiceTotals } = require('../tax-utils');
const { createCustomerStoreCreditService } = require('../customer-store-credit-service');
const {
  normalizeSalePayments,
  summarizePaymentChannel,
  createStructuredAuditWriter,
  hasOpenCashierShiftForUser,
  isCashPayment,
} = require('./shared');

function createSalesFlowHandlers(deps) {
  const {
    db,
    userHasPermission,
    makeDocNo,
    addCustomerLedgerEntry,
    addTreasuryTransaction,
    addAuditLog,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalSales,
    resolveBranchLocationScope,
  } = deps;

  const { updateCustomerStoreCredit } = createCustomerStoreCreditService({ db });
  const writeStructuredAudit = createStructuredAuditWriter(addAuditLog);
  const hasOpenShiftForUser = (userId) => hasOpenCashierShiftForUser(db, userId);

    function createSaleRecord(payload, user) {
      const tx = db.transaction(() => {
        const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: null, locationId: null };
        if (!payload.items.length) throw new Error('Sale must include at least one item');

        let subtotal = 0;
        const preparedItems = payload.items.map((item) => {
          const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId);
          if (!product) throw new Error('Product not found');
          const requestedQty = Number(item.qty || 0);
          const requestedMultiplier = Number(item.unitMultiplier || 1) || 1;
          if (!(requestedMultiplier > 0)) throw new Error('Sale unit multiplier must be greater than zero');
          const requiredQty = requestedQty * requestedMultiplier;
          const currentStock = Number(product.stock_qty || 0);
          if (currentStock < requiredQty) throw new Error(`Insufficient stock for ${product.name}`);
          const unitPrice = Number(item.price || 0);
          if (!(unitPrice >= 0)) throw new Error(`Item price cannot be negative for ${product.name}`);
          const expectedUnitPrice = (item.priceType === 'wholesale'
            ? Number(product.wholesale_price || 0)
            : Number(product.retail_price || 0)) * requestedMultiplier;
          if (Math.abs(unitPrice - expectedUnitPrice) > 0.0001 && !userHasPermission(user, 'canEditPrice')) {
            throw new Error(`Price edit is not allowed for ${product.name}`);
          }
          const lineTotal = requestedQty * unitPrice;
          subtotal += lineTotal;
          return {
            product,
            qty: requestedQty,
            unitName: item.unitName || 'قطعة',
            unitMultiplier: requestedMultiplier,
            unitPrice,
            lineTotal,
            priceType: item.priceType || 'retail',
            requiredQty
          };
        });

        if (!userHasPermission(user, 'canDiscount') && Math.abs(Number(payload.discount || 0)) > 0.0001) {
          throw new Error('Discount change is not allowed');
        }
        if (!(Number(payload.discount || 0) >= 0)) throw new Error('Discount cannot be negative');
        if (Number(payload.discount || 0) > subtotal) throw new Error('Discount cannot exceed subtotal');
        if (!(Number(payload.paidAmount || 0) >= 0)) throw new Error('Paid amount cannot be negative');
        const saleTotals = computeInvoiceTotals({
          subtotal,
          discount: Number(payload.discount || 0),
          taxRate: payload.taxRate,
          pricesIncludeTax: payload.pricesIncludeTax,
        });
        const taxRate = saleTotals.taxRate;
        const pricesIncludeTax = saleTotals.pricesIncludeTax;
        const taxAmount = saleTotals.taxAmount;
        const total = saleTotals.total;
        const customer = payload.customerId ? db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(payload.customerId) : null;
        if (payload.customerId && !customer) throw new Error('Customer not found');
        if (payload.paymentType === 'credit' && !customer) throw new Error('Credit sale requires a customer');
        if (isCashPayment(payload.paymentType, payload.paymentChannel) && !hasOpenShiftForUser(user.id) && !['admin', 'super_admin'].includes(String(user.role || ''))) {
          throw new Error('Open cashier shift is required before posting a cash sale');
        }

        const requestedStoreCredit = Math.max(0, Number(payload.storeCreditUsed || 0));
        if (requestedStoreCredit > total + 0.0001) throw new Error('Store credit cannot exceed invoice total');
        if (requestedStoreCredit > 0 && !customer) throw new Error('Store credit requires a customer');
        if (requestedStoreCredit > 0 && customer && requestedStoreCredit - Number(customer.store_credit_balance || 0) > 0.0001) throw new Error('Store credit exceeds available balance');

        const collectibleTotal = Math.max(0, Number((total - requestedStoreCredit).toFixed(2)));
        const payments = payload.paymentType === 'credit'
          ? []
          : (() => {
            const normalized = normalizeSalePayments(payload);
            if (normalized.length) return normalized;
            return collectibleTotal > 0 ? [{ paymentChannel: 'cash', amount: collectibleTotal }] : [];
          })();
        const paidAmount = payload.paymentType === 'credit' ? 0 : Number(payments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0).toFixed(2));
        if (payload.paymentType !== 'credit' && paidAmount + 0.0001 < collectibleTotal) {
          throw new Error('Paid amount cannot be less than invoice total');
        }
        const salePaymentChannel = summarizePaymentChannel(payments, payload.paymentType);
        if (payload.paymentType === 'credit' && customer) {
          const nextBalance = Number(customer.balance || 0) + collectibleTotal;
          if (Number(customer.credit_limit || 0) > 0 && nextBalance > Number(customer.credit_limit || 0)) {
            throw new Error('Customer credit limit exceeded');
          }
        }

        const saleInfo = db.prepare(`
          INSERT INTO sales (customer_id, customer_name, payment_type, payment_channel, subtotal, discount, tax_rate, tax_amount, prices_include_tax, total, paid_amount, store_credit_used, status, note, branch_id, location_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)
        `).run(
          payload.customerId,
          customer ? customer.name : 'عميل نقدي',
          payload.paymentType,
          salePaymentChannel,
          subtotal,
          Number(payload.discount || 0),
          taxRate,
          taxAmount,
          pricesIncludeTax ? 1 : 0,
          total,
          paidAmount,
          requestedStoreCredit,
          payload.note || '',
          scope.branchId,
          scope.locationId,
          user.id
        );
        const saleId = Number(saleInfo.lastInsertRowid);
        const docNo = makeDocNo('S', saleId);
        db.prepare('UPDATE sales SET doc_no = ? WHERE id = ?').run(docNo, saleId);

        for (const payment of payments) {
          db.prepare('INSERT INTO sale_payments (sale_id, payment_channel, amount) VALUES (?, ?, ?)').run(saleId, payment.paymentChannel, Number(payment.amount || 0));
        }

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
          const beforeQty = Number(item.product.stock_qty || 0);
          const afterQty = beforeQty - item.requiredQty;
          db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, item.product.id);
          db.prepare(`
            INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, branch_id, location_id, created_by)
            VALUES (?, 'sale', ?, ?, ?, 'sale', ?, 'sale', ?, ?, ?, ?)
          `).run(item.product.id, -item.requiredQty, beforeQty, afterQty, `Sale ${docNo}`, saleId, scope.branchId, scope.locationId, user.id);
        }

        if (requestedStoreCredit > 0 && customer) {
          updateCustomerStoreCredit(customer.id, -requestedStoreCredit);
          addAuditLog('استخدام رصيد متجر', `تم استخدام رصيد متجر بقيمة ${requestedStoreCredit} في ${docNo}`, user.id);
        }
        if (payload.paymentType === 'credit' && customer) {
          if (collectibleTotal > 0) addCustomerLedgerEntry(customer.id, 'sale_credit', collectibleTotal, `فاتورة بيع ${docNo}`, 'sale', saleId, user.id);
          addAuditLog('بيع آجل', `تم تسجيل ${docNo} على العميل ${customer.name} بقيمة ${collectibleTotal}`, user.id);
        } else {
          for (const payment of payments) {
            if (payment.paymentChannel !== 'cash') continue;
            addTreasuryTransaction('sale', Number(payment.amount || 0), `فاتورة بيع ${docNo} - نقدي`, 'sale', saleId, user.id, scope.branchId, scope.locationId);
          }
          const auditAction = salePaymentChannel === 'mixed' ? 'بيع مختلط' : (salePaymentChannel === 'card' ? 'بيع بطاقة' : 'بيع نقدي');
          writeStructuredAudit(auditAction, user, {
            before: null,
            after: {
              id: saleId,
              docNo,
              customerId: customer ? customer.id : null,
              customerName: customer ? customer.name : '',
              subTotal: Number(subtotal || 0),
              discount: Number(payload.discount || 0),
              taxRate: Number(taxRate || 0),
              taxAmount: Number(taxAmount || 0),
              total: Number(total || 0),
              paidAmount: Number(paidAmount || 0),
              storeCreditUsed: Number(requestedStoreCredit || 0),
              paymentType: payload.paymentType,
              paymentChannel: salePaymentChannel,
              payments: payments.map((payment) => ({ paymentChannel: payment.paymentChannel, amount: Number(payment.amount || 0) })),
              branchId: scope.branchId,
              locationId: scope.locationId,
              items: preparedItems.map((item) => ({ productId: item.product.id, qty: Number(item.qty || 0), unitPrice: Number(item.unitPrice || 0), unitName: item.unitName, unitMultiplier: Number(item.unitMultiplier || 1), priceType: item.priceType }))
            }
          });
        }

        persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
        return relationalSales().find((s) => Number(s.id) == saleId);
      });
      return tx();
    }
  return { createSaleRecord };
}

module.exports = { createSalesFlowHandlers };
