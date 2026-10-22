import { describe, expect, it } from 'vitest';
import { buildFashionVariantDrafts, splitFashionTokens } from './fashion-variants.utils';

describe('fashion variants', () => {
  it('preserves fractional shoe sizes and hyphenated labels', () => {
    expect(splitFashionTokens('42.5، 43، 2-3 سنوات')).toEqual(['42.5', '43', '2-3 سنوات']);
  });

  it('deduplicates equivalent Arabic spellings while retaining the first label', () => {
    expect(splitFashionTokens('أحمر، احمر، أسود')).toHaveLength(2);
  });

  it('retains manually entered variants and quantities during generation', () => {
    const old = [{ id: 'old', color: 'أسود', size: '42.5', barcode: 'OLD-1', stock: 8, isManual: true }];
    const rows = buildFashionVariantDrafts(['أسود'], ['42.5', '43'], old, 2);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.size === '42.5')?.stock).toBe(8);
    expect(rows.find((row) => row.size === '43')?.stock).toBe(2);
  });
});
