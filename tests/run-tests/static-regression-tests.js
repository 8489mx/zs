const assert = require('assert');
const fs = require('fs');
const path = require('path');

function readProjectFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...parts), 'utf8');
}

function runStaticRegressionTests() {
  const bootstrapSource = readProjectFile('src', 'bootstrap.js');
  const adminAccessDocSource = readProjectFile('docs', 'admin-access.md');
  const configSource = readProjectFile('src', 'config.js');
  const serverSource = readProjectFile('src', 'server.js');
  const transactionSource = readProjectFile('src', 'transaction-service.js');
  const mutationServiceSource = readProjectFile('src', 'transaction-mutation-service.js');

  assert.ok(bootstrapSource.includes("const BUNDLED_DEFAULT_ADMIN_PASSWORD = 'infoadmin';"));
  assert.ok(bootstrapSource.includes('Using bundled development admin credentials for first install'));
  assert.ok(bootstrapSource.includes('bootstrap admin credentials are ignored after first bootstrap'));
  assert.ok(adminAccessDocSource.includes('ZS / infoadmin'));
  assert.ok(configSource.includes("ALLOW_LEGACY_STATE_WRITE || 'false'"));
  assert.ok(serverSource.includes('createBackupRestoreService'));

  assert.ok(transactionSource.includes("const increaseQty = Number(item.qty || 0) * Number(item.unitMultiplier || 1);"));
  assert.ok(transactionSource.includes("const restoreQty = qty * Number(item.unitMultiplier || 1);"));
  assert.ok(transactionSource.includes("const decreaseQty = qty * Number(item.unitMultiplier || 1);"));
  assert.ok(transactionSource.includes("addTreasuryTransaction('customer_payment', amount, `تحصيل من العميل ${customer.name}${note ? ' - ' + note : ''}`, 'customer_payment', paymentId, user.id"));
  assert.ok(transactionSource.includes("if (!(currentBalance > 0)) throw new Error('Customer has no outstanding balance');"));
  assert.ok(transactionSource.includes("if (amount - currentBalance > 0.0001) throw new Error('Customer payment cannot exceed outstanding balance');"));
  assert.ok(transactionSource.includes("if (!(currentBalance > 0)) throw new Error('Supplier has no outstanding balance');"));
  assert.ok(transactionSource.includes("if (amount - currentBalance > 0.0001) throw new Error('Supplier payment cannot exceed outstanding balance');"));
  assert.ok(transactionSource.includes("if ((sale.status || 'posted') !== 'posted') throw new Error('Returns are allowed only for posted sales');"));
  assert.ok(transactionSource.includes("if ((purchase.status || 'posted') !== 'posted') throw new Error('Returns are allowed only for posted purchases');"));
  assert.ok(transactionSource.includes("refundMethod === 'cash'"));
  assert.ok(transactionSource.includes("addTreasuryTransaction('sale_return', -remainingPortion, referenceNote, 'sale_return', returnId, user.id"));
  assert.ok(transactionSource.includes('sale_return_store_credit_restore'));
  assert.ok(transactionSource.includes("addSupplierLedgerEntry(Number(purchase.supplierId), 'purchase_return_credit', -appliedAmount, referenceNote, 'purchase_return', returnId, user.id);"));

  assert.ok(mutationServiceSource.includes("addCustomerLedgerEntry(sale.customer_id, 'sale_cancel'"));
  assert.ok(mutationServiceSource.includes("addSupplierLedgerEntry(purchase.supplier_id, 'purchase_cancel'"));
}

module.exports = {
  runStaticRegressionTests,
};
