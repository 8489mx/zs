import assert from 'node:assert/strict';
import { buildCustomerLedgerTotals, buildSupplierLedgerTotals } from '../../src/modules/reports/helpers/reports-partner-ledger.helper';

const customerTotals = buildCustomerLedgerTotals([
  { customer_id: 1, balance_total: '15.255' },
  { customer_id: 2, balance_total: 20 },
]);
assert.equal(customerTotals.get('1'), 15.26);
assert.equal(customerTotals.get('2'), 20);

const supplierTotals = buildSupplierLedgerTotals([
  { supplier_id: 9, balance_total: '-10.505' },
  { supplier_id: 10, balance_total: 5 },
]);
assert.equal(supplierTotals.get('9'), -10.51);
assert.equal(supplierTotals.get('10'), 5);

console.log('reports partner ledger helper checks passed');
