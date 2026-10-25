import { describe, expect, it } from 'vitest';
import { acquireInventoryAttempt, mayReleaseInventoryAttempt, inventoryTransferActionAttemptKey } from './inventory-operation-attempt';
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

describe('bulk transfer attempt keys', () => {
  it('separates transfer IDs and receive/cancel operation identities', () => {
    expect(inventoryTransferActionAttemptKey('receive', '12')).toBe('receive:12');
    expect(inventoryTransferActionAttemptKey('receive', '12')).not.toBe(inventoryTransferActionAttemptKey('cancel', '12'));
    expect(inventoryTransferActionAttemptKey('receive', '12')).not.toBe(inventoryTransferActionAttemptKey('receive', '13'));
  });
  it('rejects a changed partial receipt payload when its first key was reserved', () => {
    const first = acquireInventoryAttempt(null, { transferId: '12', action: 'receive', items: [{itemId:1,receivedQty:2}] },
      'POST:/api/stock-transfers/:id/receive', () => 'stable');
    expect(() => acquireInventoryAttempt(first, { transferId: '12', action: 'receive', items: [{itemId:1,receivedQty:3}] },
      first.operationType, () => 'new')).toThrow();
  });
});
