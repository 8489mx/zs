import assert from 'node:assert/strict';
import { calculateSalesReturnCost } from '../../src/modules/accounting/engines/sales-return-cost.engine';

const original = [
  { id: 11, product_id: 7, cost_price: 10 },
  { id: 12, product_id: 7, cost_price: 18 },
];

assert.equal(calculateSalesReturnCost([{ product_id: 7, sale_item_id: 12, qty: 2 }], original), 36);
assert.equal(calculateSalesReturnCost([
  { product_id: 7, sale_item_id: 11, qty: 1 },
  { product_id: 7, sale_item_id: 12, qty: 1 },
], original), 28);
assert.throws(() => calculateSalesReturnCost([{ product_id: 7, sale_item_id: null, qty: 1 }], original), /Ambiguous/);
assert.throws(() => calculateSalesReturnCost([{ product_id: 7, sale_item_id: 99, qty: 1 }], original), /missing/);
assert.throws(() => calculateSalesReturnCost([{ product_id: 7, sale_item_id: 11, qty: 1 }], [
  { id: 11, product_id: 7, cost_price: null },
]), /Ambiguous/);
assert.equal(calculateSalesReturnCost([{ product_id: 7, sale_item_id: null, qty: 1 }], [
  { id: 11, product_id: 7, cost_price: 10 }, { id: 12, product_id: 7, cost_price: 10 },
]), 10);
console.log('sales return cost checks passed');
