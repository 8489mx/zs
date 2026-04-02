const { createCustomerStoreCreditService } = require('../customer-store-credit-service');
const { createStructuredAuditWriter, splitSaleReturnSources, hasOpenCashierShiftForUser } = require('./shared');
const { parseReturnPayload } = require('./returns-flow-lib/payload');
const { handleSaleReturn } = require('./returns-flow-lib/sale-return');
const { handlePurchaseReturn } = require('./returns-flow-lib/purchase-return');

function createReturnFlowHandlers(deps) {
  const {
    db,
    makeDocNo,
    addCustomerLedgerEntry,
    addSupplierLedgerEntry,
    addTreasuryTransaction,
    addAuditLog,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalSales,
    relationalPurchases,
    resolveBranchLocationScope,
    assertManagerPin,
  } = deps;

  const { updateCustomerStoreCredit } = createCustomerStoreCreditService({ db });
  const verifyManagerPin = typeof assertManagerPin === 'function' ? assertManagerPin : (() => {});
  const writeReturnAudit = createStructuredAuditWriter(addAuditLog);
  const hasOpenShiftForUser = (userId) => hasOpenCashierShiftForUser(db, userId);

  function createReturnRecord(payload, user) {
    const tx = db.transaction(() => {
      verifyManagerPin(String((payload || {}).managerPin || '').trim());
      const scope = resolveBranchLocationScope ? resolveBranchLocationScope(payload, user) : { branchId: null, locationId: null };
      const parsed = parseReturnPayload(payload || {});

      const result = parsed.returnType === 'sale'
        ? handleSaleReturn({ db, relationalSales, hasOpenShiftForUser, splitSaleReturnSources, updateCustomerStoreCredit, addCustomerLedgerEntry, addTreasuryTransaction, user, invoiceId: parsed.invoiceId, normalizedItems: parsed.normalizedItems, settlementMode: parsed.settlementMode, refundMethod: parsed.refundMethod, note: parsed.note, scope })
        : handlePurchaseReturn({ db, relationalPurchases, addSupplierLedgerEntry, addTreasuryTransaction, user, invoiceId: parsed.invoiceId, normalizedItems: parsed.normalizedItems, settlementMode: parsed.settlementMode, refundMethod: parsed.refundMethod, note: parsed.note, scope });

      const docNo = makeDocNo(result.docNoPrefix, result.returnId);
      for (const insertedReturnId of result.insertedReturnIds) {
        db.prepare('UPDATE returns SET doc_no = ? WHERE id = ?').run(docNo, insertedReturnId);
      }

      writeReturnAudit(parsed.returnType === 'sale' ? 'مرتجع بيع' : 'مرتجع شراء', user, {
        before: null,
        after: {
          id: Number(result.returnId || 0),
          docNo,
          returnType: parsed.returnType,
          invoiceId: Number(parsed.invoiceId || 0),
          items: parsed.normalizedItems.map((entry) => ({ productId: Number(entry.productId || 0), qty: Number(entry.qty || 0) })),
          total: Number(result.total || 0),
          settlementMode: parsed.settlementMode,
          refundMethod: parsed.refundMethod,
          note: parsed.note,
        },
      });
      persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
      return { ok: true, returnId: result.returnId, returnIds: result.insertedReturnIds, docNo, total: result.total };
    });

    return tx();
  }

  return { createReturnRecord };
}

module.exports = { createReturnFlowHandlers };
