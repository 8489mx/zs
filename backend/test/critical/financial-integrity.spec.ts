import { strict as assert } from 'node:assert';
import { AppError } from '../../src/common/errors/app-error';
import { ensureReturnQtyWithinLimit, ensureUniqueFlowItems, validateSalePayments } from '../../src/common/utils/financial-integrity';

function expectAppError(fn: () => void, code: string): void {
  try {
    fn();
    assert.fail(`Expected AppError(${code})`);
  } catch (error) {
    assert.ok(error instanceof AppError);
    assert.equal((error as AppError).code, code);
  }
}

ensureUniqueFlowItems([{ productId: 1, qty: 1 }, { productId: 2, qty: 1 }], 'DUP', 'dup');
expectAppError(() => ensureUniqueFlowItems([{ productId: 1, qty: 1 }, { productId: 1, qty: 2 }], 'DUP', 'dup'), 'DUP');

assert.deepEqual(validateSalePayments({ paymentType: 'credit', collectibleTotal: 10, payments: [] }), { paidAmount: 0 });
assert.equal(validateSalePayments({ paymentType: 'cash', collectibleTotal: 10, payments: [{ paymentChannel: 'cash', amount: 10 }] }).paidAmount, 10);
expectAppError(() => validateSalePayments({ paymentType: 'cash', collectibleTotal: 10, payments: [{ paymentChannel: 'cash', amount: 9.5 }] }), 'PAYMENT_AMOUNT_INSUFFICIENT');
expectAppError(() => validateSalePayments({ paymentType: 'credit', collectibleTotal: 10, payments: [{ paymentChannel: 'cash', amount: 10 }] }), 'CREDIT_PAYMENTS_NOT_ALLOWED');

ensureReturnQtyWithinLimit(1, 1, 3);
expectAppError(() => ensureReturnQtyWithinLimit(2.1, 1, 3), 'RETURN_QTY_EXCEEDED');

console.log('financial-integrity.spec: ok');
