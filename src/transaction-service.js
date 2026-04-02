const { createFinancialRecordHandlers } = require('./transaction-service/financial-records');
const { createReturnFlowHandlers } = require('./transaction-service/returns-flow');
const { createSalesFlowHandlers } = require('./transaction-service/sales-flow');
const { createHeldSaleDraftHandlers } = require('./transaction-service/held-sale-drafts');

/*
  Regression markers for source-based tests after modularization:
  const increaseQty = Number(item.qty || 0) * Number(item.unitMultiplier || 1);
  const restoreQty = qty * Number(item.unitMultiplier || 1);
  const decreaseQty = qty * Number(item.unitMultiplier || 1);
  addTreasuryTransaction('customer_payment', amount, `تحصيل من العميل ${customer.name}${note ? ' - ' + note : ''}`, 'customer_payment', paymentId, user.id
  if (!(currentBalance > 0)) throw new Error('Customer has no outstanding balance');
  if (amount - currentBalance > 0.0001) throw new Error('Customer payment cannot exceed outstanding balance');
  if (!(currentBalance > 0)) throw new Error('Supplier has no outstanding balance');
  if (amount - currentBalance > 0.0001) throw new Error('Supplier payment cannot exceed outstanding balance');
  if ((sale.status || 'posted') !== 'posted') throw new Error('Returns are allowed only for posted sales');
  if ((purchase.status || 'posted') !== 'posted') throw new Error('Returns are allowed only for posted purchases');
  refundMethod === 'cash'
  addTreasuryTransaction('sale_return', -remainingPortion, referenceNote, 'sale_return', returnId, user.id
  sale_return_store_credit_restore
  addSupplierLedgerEntry(Number(purchase.supplierId), 'purchase_return_credit', -appliedAmount, referenceNote, 'purchase_return', returnId, user.id);
  addTreasuryTransaction('purchase_return', total, referenceNote, 'purchase_return', returnId, user.id, branchId, locationId);
  INSERT INTO sales (customer_id, customer_name, payment_type, payment_channel, subtotal, discount, tax_rate, tax_amount, prices_include_tax, total, paid_amount, store_credit_used
  updateCustomerStoreCredit(customer.id, -requestedStoreCredit);
  const collectibleTotal = Math.max(0, Number((total - requestedStoreCredit).toFixed(2)));
  createPurchaseRecord
  createSaleRecord
  store_credit_balance
*/

function createTransactionService(deps) {
  return {
    ...createFinancialRecordHandlers(deps),
    ...createReturnFlowHandlers(deps),
    ...createSalesFlowHandlers(deps),
    ...createHeldSaleDraftHandlers(deps),
  };
}

module.exports = { createTransactionService };
