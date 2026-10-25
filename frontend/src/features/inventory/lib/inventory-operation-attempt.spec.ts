import { describe, expect, it } from 'vitest';
import { acquireInventoryAttempt, mayReleaseInventoryAttempt } from './inventory-operation-attempt';
describe('inventory stable operation retries', () => {
  it('reuses the identical operation key and immutable payload', () => {
    const first = acquireInventoryAttempt(null, { locationId: 1, items: [1] }, 'POST:/api/stock-count-sessions', () => 'key');
    expect(acquireInventoryAttempt(first, { locationId: 1, items: [1] }, first.operationType, () => 'another').key).toBe('key');
    expect(() => acquireInventoryAttempt(first, { locationId: 2, items: [1] }, first.operationType, () => 'another')).toThrow();
  });
  it('does not release the key for unknown outcomes', () => {
    expect(mayReleaseInventoryAttempt(502,'not_found')).toBe(false);
    expect(mayReleaseInventoryAttempt(409,'processing')).toBe(false);
    expect(mayReleaseInventoryAttempt(0,undefined)).toBe(false);
    expect(mayReleaseInventoryAttempt(400,'failed')).toBe(true);
  });
});
