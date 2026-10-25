import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertFashionRemovedStockSafe } from '../../src/modules/catalog/engines/fashion-stock-safety.engine';

const item = { stock_qty: '5.000', reserved_qty: '0', cost_price: '25.00' };

test('fashion merge allows fully reconciled, unreserved stock of the same cost', () => {
  assert.doesNotThrow(() => assertFashionRemovedStockSafe(item, [
    { qty: '2.000' }, { qty: '3.000' },
  ], 25));
});

test('fashion group must not archive or zero stock reserved for an order', () => {
  assert.throws(
    () => assertFashionRemovedStockSafe({ ...item, reserved_qty: '1.000' }, [{ qty: '5.000' }]),
    (err: unknown) => (err as { code?: string }).code === 'FASHION_VARIANT_RESERVED',
  );
});

test('fashion group cannot hide unassigned or missing stock balances', () => {
  assert.throws(
    () => assertFashionRemovedStockSafe(item, [{ qty: '3.000' }], 25),
    (err: unknown) => (err as { code?: string }).code === 'FASHION_STOCK_RECONCILIATION_REQUIRED',
  );
});

test('fashion stock merge must reject cost mismatch without a valuation adjustment', () => {
  assert.throws(
    () => assertFashionRemovedStockSafe(item, [{ qty: '5.000' }], 27),
    (err: unknown) => (err as { code?: string }).code === 'FASHION_VALUATION_ADJUSTMENT_REQUIRED',
  );
});

test('zero stock with no reservation can be archived safely', () => {
  assert.doesNotThrow(() => assertFashionRemovedStockSafe({
    stock_qty: 0, reserved_qty: 0, cost_price: 25,
  }, []));
});
