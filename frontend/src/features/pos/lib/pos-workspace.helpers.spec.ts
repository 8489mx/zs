import { describe, expect, it } from 'vitest';
import { computeDraftTotal } from './pos-workspace.helpers';

describe('retail held POS draft totals', () => {
  it('multiplies modifier price by its quantity and by the cart line quantity', () => {
    const total = computeDraftTotal({
      discount: 5,
      cart: [{ qty: 2, price: 100, modifiers: [{ price: 3, qty: 4 }, { price: 5, qty: 1 }] }],
    } as any);
    expect(total).toBe(229);
  });

  it('preserves legacy modifiers with no explicit quantity', () => {
    const total = computeDraftTotal({
      discount: 0,
      cart: [{ qty: 1, price: 20, modifiers: [{ price: 7 }] }],
    } as any);
    expect(total).toBe(27);
  });
});
