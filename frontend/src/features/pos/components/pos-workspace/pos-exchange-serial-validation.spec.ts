import { describe, expect, it } from 'vitest';
import { normalizeExchangeReturnSerials } from './pos-exchange-serial-validation';
describe('POS atomic exchange return serials', () => {
  it('rejects missing, duplicate, or foreign serials before creating financial operation', () => {
    expect(() => normalizeExchangeReturnSerials(['SN1', 'SN2'], '', 1, 'قميص')).toThrow();
    expect(() => normalizeExchangeReturnSerials(['SN1', 'SN2'], 'SN1,SN1', 2, 'قميص')).toThrow();
    expect(() => normalizeExchangeReturnSerials(['SN1', 'SN2'], 'SN3', 1, 'قميص')).toThrow();
  });
  it('accepts exact, case-insensitive original serial selection', () => {
    expect(normalizeExchangeReturnSerials(['SN1', 'SN2'], 'sn2', 1, 'قميص')).toEqual(['sn2']);
  });
  it('rejects supplied serials for non-serial stock lines', () => {
    expect(() => normalizeExchangeReturnSerials([], 'OTHER', 1, 'قميص')).toThrow();
  });
});
