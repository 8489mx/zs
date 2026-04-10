import assert from 'node:assert/strict';
import { AppError } from '../../src/common/errors/app-error';
import { buildHistoricCostMap, buildNormalizedPurchaseItem, buildPurchaseReferenceNote, calculatePurchaseStockDecrease, calculatePurchaseStockIncrease, calculatePurchaseSubtotal, ensureAmountWithinOutstanding, normalizeOptionalNote, normalizePositiveAmount, normalizePurchaseScope } from '../../src/modules/purchases/helpers/purchases-write.helper';

const normalized = buildNormalizedPurchaseItem(
  { productId: 9, qty: 2, cost: 7.5, unitName: 'علبة', unitMultiplier: 3, name: '' } as never,
  { id: 9, name: 'Coffee', stock_qty: '5' },
);
assert.deepEqual(normalized, {
  productId: 9,
  name: 'Coffee',
  qty: 2,
  cost: 7.5,
  unitName: 'علبة',
  unitMultiplier: 3,
  total: 15,
});
assert.equal(calculatePurchaseSubtotal([{ total: 10 }, { total: 4.255 }]), 14.26);
assert.deepEqual(calculatePurchaseStockIncrease('2', '1.5', '4'), { increasedQty: 3, beforeQty: 4, afterQty: 7 });
assert.deepEqual(calculatePurchaseStockDecrease('2', '1.5', '7'), { removedQty: 3, beforeQty: 7, afterQty: 4 });
assert.deepEqual([...buildHistoricCostMap([{ product_id: '1', unit_cost: '4.5' }, { product_id: 2, unit_cost: 3 }])], [[1, 4.5], [2, 3]]);

assert.throws(
  () => buildNormalizedPurchaseItem({ productId: 5, qty: 1, cost: 2 } as never, { id: 5, name: '' }),
  (error: unknown) => error instanceof AppError && error.code === 'PRODUCT_NAME_REQUIRED',
);

console.log('purchases write helper checks passed');

assert.deepEqual(normalizePurchaseScope({ branchId: '3', locationId: 8 }), { branchId: 3, locationId: 8 });
assert.equal(normalizeOptionalNote('  memo  '), 'memo');
assert.equal(normalizePositiveAmount('4.255'), 4.26);
assert.equal(buildPurchaseReferenceNote('إلغاء فاتورة شراء', { doc_no: 'PUR-8' }), 'إلغاء فاتورة شراء PUR-8');
assert.throws(
  () => ensureAmountWithinOutstanding(12, 10, 'OVERPAYMENT', 'too much'),
  (error: unknown) => error instanceof AppError && error.code === 'OVERPAYMENT',
);
