import { describe, expect, it } from 'vitest';
import { remainingInvoiceLineQuantity } from './return-remaining-quantity';
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
