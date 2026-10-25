import { describe, expect, it } from 'vitest';
import { canResetExchangeRequest, classifyExchangeRecovery } from './pos-exchange-recovery';

describe('POS exchange idempotency recovery', () => {
  it('recognizes an already-posted exchange despite a lost HTTP response', () => {
    expect(classifyExchangeRecovery({ status: 'processing', documentId: '7' })).toBe('committed');
    expect(classifyExchangeRecovery({ status: 'committed' })).toBe('committed');
  });

  it('retains the original key for processing, manual recovery or unknown outcome', () => {
    for (const state of ['processing', 'recovery_required', 'unknown', 'committed'] as const) {
      expect(canResetExchangeRequest(409, state)).toBe(false);
      expect(canResetExchangeRequest(422, state)).toBe(false);
    }
  });

  it('permits a new attempt only after confirmed rejection or a never-recorded request', () => {
    expect(canResetExchangeRequest(422, 'failed')).toBe(true);
    expect(canResetExchangeRequest(409, 'not_found')).toBe(true);
    expect(canResetExchangeRequest(0, 'not_found')).toBe(false);
    expect(canResetExchangeRequest(502, 'failed')).toBe(false);
  });
});
