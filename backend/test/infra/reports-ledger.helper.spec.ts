import assert from 'node:assert/strict';
import {
  buildCustomerBalancesPayload,
  buildCustomerLedgerPayload,
  buildLedgerSummary,
  buildSupplierBalancesPayload,
  buildSupplierLedgerPayload,
  mapLedgerEntries,
} from '../../src/modules/reports/helpers/reports-ledger.helper';

const customerPayload = buildCustomerBalancesPayload(
  [
    { id: 1, name: 'Ali', phone: '010', balance: 0, credit_limit: 500 },
    { id: 2, name: 'Mona', phone: '020', balance: 50, credit_limit: 100 },
  ],
  new Map([['1', 200]]),
  { filter: 'all', page: 1, pageSize: 20 },
);
assert.equal((customerPayload.customers as any[]).length, 2);
assert.equal((customerPayload.customers as any[])[0].availableCredit, 300);
assert.equal((customerPayload.summary as any).totalBalance, 250);

const supplierPayload = buildSupplierBalancesPayload(
  [
    { id: 5, name: 'North', phone: '100', balance: 0 },
    { id: 6, name: 'South', phone: '200', balance: 150 },
  ],
  new Map([['5', 75]]),
  { filter: 'all', page: 1, pageSize: 20 },
);
assert.equal((supplierPayload.suppliers as any[]).length, 2);
assert.equal((supplierPayload.summary as any).totalBalance, 225);

const entries = mapLedgerEntries([
  { id: 9, entry_type: 'invoice', amount: 120, balance_after: 300, note: 'posted', reference_type: 'sale', reference_id: 88, created_at: '2026-04-09T00:00:00.000Z' },
]);
assert.deepEqual(entries[0], {
  id: '9',
  type: 'invoice',
  amount: 120,
  balanceAfter: 300,
  note: 'posted',
  referenceType: 'sale',
  referenceId: '88',
  createdAt: '2026-04-09T00:00:00.000Z',
});

assert.deepEqual(buildLedgerSummary(3, { debits_total: 125, credits_total: -25 }), {
  totalEntries: 3,
  totalDebits: 125,
  totalCredits: 25,
});

const customerLedgerPayload = buildCustomerLedgerPayload({
  customer: { id: 1, name: 'Ali', phone: '010', balance: 200, credit_limit: 500 },
  rows: [{ id: 1, entry_type: 'invoice', amount: 200, balance_after: 200, note: 'open', created_at: '2026-04-09' }],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalsRow: { debits_total: 200, credits_total: 0 },
});
assert.equal((customerLedgerPayload.customer as any).creditLimit, 500);
assert.equal((customerLedgerPayload.summary as any).totalDebits, 200);

const supplierLedgerPayload = buildSupplierLedgerPayload({
  supplier: { id: 4, name: 'Supp', phone: '777', balance: 90 },
  rows: [{ id: 2, entry_type: 'bill', amount: 90, balance_after: 90, note: 'open', created_at: '2026-04-09' }],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalsRow: { debits_total: 90, credits_total: 0 },
});
assert.equal((supplierLedgerPayload.supplier as any).balance, 90);
assert.equal(((supplierLedgerPayload.entries as any[])?.[0] || {}).type, 'bill');

console.log('reports-ledger.helper.spec: ok');
