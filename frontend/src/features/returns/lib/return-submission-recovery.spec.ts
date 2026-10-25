import { describe, expect, it } from 'vitest';
import { mayReleaseReturnIdempotencyKey, wasReturnCommitted } from './return-submission-recovery';
import { createEmptyReturnForm } from './returns-workspace.helpers';
describe('financial return idempotency', () => {
  it('treats a recorded return document as committed despite a lost HTTP response', () => {
    expect(wasReturnCommitted('processing', '42')).toBe(true);
    expect(wasReturnCommitted('committed')).toBe(true);
  });
  it('retains the same operation on timeout, processing or uncertain recovery', () => {
    expect(mayReleaseReturnIdempotencyKey(0, 'not_found')).toBe(false);
    expect(mayReleaseReturnIdempotencyKey(409, 'processing')).toBe(false);
    expect(mayReleaseReturnIdempotencyKey(422, 'recovery_required')).toBe(false);
    expect(mayReleaseReturnIdempotencyKey(502, 'unknown')).toBe(false);
  });
  it('releases only after confirmed failure or definite rejected request', () => {
    expect(mayReleaseReturnIdempotencyKey(400, 'failed')).toBe(true);
    expect(mayReleaseReturnIdempotencyKey(400, 'not_found')).toBe(true);
  });
  it('retains purchase return mode after form reset', () => {
    expect(createEmptyReturnForm('purchase').type).toBe('purchase');
    expect(createEmptyReturnForm().type).toBe('sale');
  });
});
