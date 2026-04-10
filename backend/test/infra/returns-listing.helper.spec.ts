import assert from 'node:assert/strict';
import { filterReturnRows, mapReturnRows, summarizeReturnRows } from '../../src/modules/returns/helpers/returns-listing.helper';

const rows = mapReturnRows([
  { id: 1, return_document_id: 10, doc_no: 'RET-10', return_type: 'sale', invoice_id: 20, product_id: 2, product_name: 'Tea', qty: 1, line_total: 15, note: 'damaged', settlement_mode: 'refund', refund_method: 'cash', created_at: '2026-04-09T10:00:00.000Z' },
  { id: 2, return_document_id: 11, doc_no: 'RET-11', return_type: 'purchase', invoice_id: 21, product_id: 3, product_name: 'Sugar', qty: 2, line_total: 30, note: 'expired', settlement_mode: 'refund', refund_method: 'cash', created_at: '2026-04-08T10:00:00.000Z' },
]);

assert.equal(rows.length, 2);
assert.equal(rows[0].docNo, 'RET-10');
assert.equal(rows[1].returnType, 'purchase');

const salesOnly = filterReturnRows(rows, { filter: 'sales' }, '2026-04-09');
assert.equal(salesOnly.length, 1);
assert.equal(salesOnly[0].returnType, 'sale');

const searched = filterReturnRows(rows, { q: 'sug' }, '2026-04-09');
assert.equal(searched.length, 1);
assert.equal(searched[0].productName, 'Sugar');

assert.deepEqual(summarizeReturnRows(rows, '2026-04-09'), {
  totalItems: 2,
  totalAmount: 45,
  salesReturns: 1,
  purchaseReturns: 1,
  todayCount: 1,
  latestDocNo: 'RET-10',
});

console.log('returns listing helper checks passed');
