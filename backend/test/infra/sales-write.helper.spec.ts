import assert from 'node:assert/strict';
import { AppError } from '../../src/common/errors/app-error';
import { buildPreparedSaleItem, calculateAllowedSaleUnitPrice, calculateCollectibleTotal, calculatePaidAmount, calculateRestoredStockQuantity, resolvePostedSalePaymentChannel, resolveSalePayments } from '../../src/modules/sales/helpers/sales-write.helper';

const prepared = buildPreparedSaleItem(
  { id: 2, name: 'Tea', stock_qty: '10', cost_price: '3.5' },
  { productId: 2, qty: 2, price: 5, unitName: 'علبة', unitMultiplier: 1.5, priceType: 'retail' },
);
assert.deepEqual(prepared, {
  productId: 2,
  productName: 'Tea',
  qty: 2,
  unitPrice: 5,
  lineTotal: 10,
  unitName: 'علبة',
  unitMultiplier: 1.5,
  priceType: 'retail',
  costPrice: 5.25,
  requiredQty: 3,
  beforeQty: 10,
  afterQty: 7,
});


assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail' }), 100);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'wholesale' }), 80);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'percent', value: 10, start_date: '2026-01-01', end_date: '2026-12-31' }], todayIso: '2026-04-14' }), 90);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'fixed', value: 15, start_date: '2026-01-01', end_date: '2026-12-31' }], todayIso: '2026-04-14' }), 85);
assert.equal(calculateAllowedSaleUnitPrice({ retailPrice: 100, wholesalePrice: 80, priceType: 'retail', offers: [{ offer_type: 'price', value: 72, start_date: '2026-01-01', end_date: '2026-12-31' }], todayIso: '2026-04-14' }), 72);

assert.equal(calculateCollectibleTotal(120, 20), 100);
assert.deepEqual(resolveSalePayments('credit', [{ paymentChannel: 'cash', amount: 10 }], 100), []);
assert.deepEqual(resolveSalePayments('cash', [], 55), [{ paymentChannel: 'cash', amount: 55 }]);
assert.equal(calculatePaidAmount([{ amount: 10 }, { amount: 5.255 }]), 15.26);
assert.equal(resolvePostedSalePaymentChannel('credit', []), 'credit');
assert.equal(resolvePostedSalePaymentChannel('cash', [{ paymentChannel: 'card' }]), 'card');
assert.equal(resolvePostedSalePaymentChannel('cash', [{ paymentChannel: 'cash' }, { paymentChannel: 'card' }]), 'mixed');
assert.deepEqual(calculateRestoredStockQuantity('4', '2', '1.5'), { restoreQty: 3, beforeQty: 4, afterQty: 7 });

assert.throws(
  () => buildPreparedSaleItem({ id: 3, name: 'Sugar', stock_qty: '1', cost_price: '2' }, { productId: 3, qty: 2, price: 5, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' }),
  (error: unknown) => error instanceof AppError && error.code === 'INSUFFICIENT_STOCK',
);

console.log('sales write helper checks passed');
