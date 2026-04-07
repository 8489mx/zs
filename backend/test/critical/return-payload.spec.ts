import { strict as assert } from 'node:assert';
import { AppError } from '../../src/common/errors/app-error';
import { normalizeReturnItems } from '../../src/modules/returns/helpers/return-payload.helper';

function expectAppError(fn: () => void, code: string): void {
  try {
    fn();
    assert.fail(`Expected AppError(${code})`);
  } catch (error) {
    assert.ok(error instanceof AppError);
    assert.equal((error as AppError).code, code);
  }
}

const saleItems = normalizeReturnItems({
  type: 'sale',
  invoiceId: 1,
  items: [{ productId: 1, qty: 1 }, { productId: 2, qty: 2 }],
});
assert.equal(saleItems.length, 2);

expectAppError(() => normalizeReturnItems({
  type: 'sale',
  invoiceId: 1,
  items: [{ productId: 1, qty: 1 }, { productId: 1, qty: 1 }],
}), 'RETURN_DUPLICATE_PRODUCT');

expectAppError(() => normalizeReturnItems({
  type: 'purchase',
  invoiceId: 1,
  settlementMode: 'store_credit',
  items: [{ productId: 1, qty: 1 }],
}), 'PURCHASE_RETURN_SETTLEMENT_INVALID');

console.log('return-payload.spec: ok');
