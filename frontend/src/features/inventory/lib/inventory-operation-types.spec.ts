import { describe, expect, it } from 'vitest';
import { INVENTORY_OPERATION_TYPES } from './inventory-operation-types';
describe('inventory idempotency lookup route keys', () => {
  it('uses real server route names rather than human labels', () => {
    expect(INVENTORY_OPERATION_TYPES.createTransfer).toBe('POST:/api/stock-transfers');
    expect(INVENTORY_OPERATION_TYPES.receiveTransfer).toBe('POST:/api/stock-transfers/:id/receive');
    expect(INVENTORY_OPERATION_TYPES.cancelTransfer).toBe('POST:/api/stock-transfers/:id/cancel');
  });
});
