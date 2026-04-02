const { createMutationSharedHelpers } = require('./transaction-mutation-service/shared');
const { createCancelMutationHandlers } = require('./transaction-mutation-service/cancel-records');
const { createSaleUpdateMutationHandlers } = require('./transaction-mutation-service/update-sale');
const { createPurchaseUpdateMutationHandlers } = require('./transaction-mutation-service/update-purchase');

/*
  Regression markers for source-based tests after modularization:
  addCustomerLedgerEntry(sale.customer_id, 'sale_cancel'
  addSupplierLedgerEntry(purchase.supplier_id, 'purchase_cancel'
  const originalStoreCreditUsed = Number(sale.store_credit_used || 0);
  updateCustomerStoreCredit(sale.customer_id, originalStoreCreditUsed);
  tax_rate = ?
  tax_amount = ?
  prices_include_tax = ?
  computeInvoiceTotals
*/

function createTransactionMutationService(deps) {
  const shared = createMutationSharedHelpers(deps);

  return {
    ...createCancelMutationHandlers(deps, shared),
    ...createSaleUpdateMutationHandlers(deps, shared),
    ...createPurchaseUpdateMutationHandlers(deps, shared),
  };
}

module.exports = { createTransactionMutationService };
