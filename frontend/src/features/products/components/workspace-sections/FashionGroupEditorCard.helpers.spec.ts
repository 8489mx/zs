import { describe, expect, it } from 'vitest';
import { deriveFashionStockPatch, pickFashionStockConsolidationTarget, type VariantDraft } from './FashionGroupEditorCard.helpers';

const variant = (id: string | undefined, color: string, costPrice = 10): VariantDraft => ({
  id, color, size: 'M', barcode: '', useCustomPricing: true, pricingEditorOpen: false,
  costPrice, retailPrice: 20, wholesalePrice: 15, stock: 4, originalStock: 4,
});

describe('fashion group inventory safety', () => {
  it('omits untouched stock when editing only model details', () => {
    expect(deriveFashionStockPatch(variant('7', 'أسود'))).toEqual({ stock: undefined, expectedStock: 4 });
  });
  it('sends original stock snapshot on an intentional adjustment', () => {
    expect(deriveFashionStockPatch({ ...variant('7', 'أسود'), stock: 3 })).toEqual({ stock: 3, expectedStock: 4 });
    expect(deriveFashionStockPatch(variant(undefined, 'أبيض'))).toEqual({ stock: 4, expectedStock: undefined });
  });
  it('never chooses an unsaved variant as consolidation target', () => {
    const rows = [variant(undefined, 'أسود'), variant('11', 'كحلي'), variant('12', 'أسود')];
    expect(pickFashionStockConsolidationTarget(rows, variant('21', 'أسود'))?.id).toBe('12');
    expect(pickFashionStockConsolidationTarget(rows, variant('22', 'أخضر'))?.id).toBe('11');
    expect(pickFashionStockConsolidationTarget([rows[0]], variant('22', 'أخضر'))).toBeUndefined();
  });
});
