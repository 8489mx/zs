import { describe, expect, it } from 'vitest';
import { remainingInvoiceLineQuantity, isSelectedReturnQuantityValid } from './return-remaining-quantity';
describe('invoice return line limits', () => {
  it('keeps quantities separate for duplicate product on different invoice lines', () => {
    expect(remainingInvoiceLineQuantity(5, 3, true, false)).toBe(2);
    expect(remainingInvoiceLineQuantity(7, 1, true, false)).toBe(6);
  });
  it('blocks missing history, old unlinked returns and negative remainder', () => {
    expect(remainingInvoiceLineQuantity(5, 1, false, false)).toBe(0);
    expect(remainingInvoiceLineQuantity(5, 1, true, true)).toBe(0);
    expect(remainingInvoiceLineQuantity(5, 6, true, false)).toBe(0);
  });
});

describe('selected return preflight after history refresh', () => {
  it('blocks a stale selected quantity even when the invoice register shows older data', () => {
    expect(isSelectedReturnQuantityValid('11','9',5,4,{'11':2},[],true)).toBe(false);
    expect(isSelectedReturnQuantityValid('11','9',5,3,{'11':2},[],true)).toBe(true);
  });
  it('does not borrow a repeated product quantity from a separate invoice line', () => {
    expect(isSelectedReturnQuantityValid('10','9',3,3,{'10':1,'11':0},[],true)).toBe(false);
    expect(isSelectedReturnQuantityValid('11','9',3,3,{'10':1,'11':0},[],true)).toBe(true);
  });
  it('rejects untracked invoice lines and unreconciled legacy returns', () => {
    expect(isSelectedReturnQuantityValid('', '9', 3, 1, {}, [], true)).toBe(false);
    expect(isSelectedReturnQuantityValid('10', '9', 3, 1, {}, ['9'], true)).toBe(false);
    expect(isSelectedReturnQuantityValid('10', '9', 3, 1, {}, [], false)).toBe(false);
    expect(isSelectedReturnQuantityValid('10', '9', 3, NaN, {}, [], true)).toBe(false);
  });
});
