import assert from 'node:assert/strict';
import { AppError } from '../../src/common/errors/app-error';
import { buildPurchaseReturnLine, buildSaleReturnLine, calculateNextLedgerBalance, calculateReturnDocumentTotal } from '../../src/modules/returns/helpers/returns-write.helper';

const saleLine = buildSaleReturnLine(
  { product_id: 2, product_name: 'Tea', qty: 4, line_total: 50, unit_multiplier: 1.5 },
  { id: 2, stock_qty: 10 },
  { productId: 2, productName: 'Tea', qty: 2 },
);
assert.deepEqual(saleLine, {
  productId: 2,
  productName: 'Tea',
  qty: 2,
  unitTotal: 12.5,
  lineTotal: 25,
  stockDelta: 3,
  beforeQty: 10,
  afterQty: 13,
});

const purchaseLine = buildPurchaseReturnLine(
  { product_id: 5, product_name: 'Sugar', qty: 5, line_total: 40, unit_multiplier: 2 },
  { id: 5, stock_qty: 12 },
  { productId: 5, productName: 'Sugar', qty: 3 },
);
assert.deepEqual(purchaseLine, {
  productId: 5,
  productName: 'Sugar',
  qty: 3,
  unitTotal: 8,
  lineTotal: 24,
  stockDelta: 6,
  beforeQty: 12,
  afterQty: 6,
});

assert.equal(calculateReturnDocumentTotal([{ lineTotal: 10.005 }, { lineTotal: 5.255 }]), 15.26);
assert.equal(calculateNextLedgerBalance('12.50', -2.245), 10.26);
assert.throws(
  () => buildPurchaseReturnLine({ product_id: 1, product_name: 'Milk', qty: 1, line_total: 5, unit_multiplier: 4 }, { id: 1, stock_qty: 2 }, { productId: 1, productName: 'Milk', qty: 1 }),
  (error: unknown) => error instanceof AppError && error.code === 'PURCHASE_RETURN_STOCK_INVALID',
);

console.log('returns write helper checks passed');
