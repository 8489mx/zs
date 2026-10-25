import { describe, expect, it } from 'vitest';
import type { Product } from '@/types/domain';
import { collectFashionBarcodeItems, getSavedUnitBarcode } from './product-barcode-print.helpers';

const product = (id: string, styleCode: string, itemKind: 'fashion' | 'standard' = 'fashion', isActive = true): Product => ({
  id, name: 'Shirt', barcode: id, styleCode, itemKind, isActive, color: 'black', size: id,
  stock: 4, minStock: 0, costPrice: 12, retailPrice: 20, wholesalePrice: 15,
  categoryId: '', supplierId: '', notes: '', units: [],
});

describe('clothing barcode print integrity', () => {
  it('does not silently print a different base barcode for a non-base unit', () => {
    const row = product('A', '');
    expect(getSavedUnitBarcode(row, { id: 'u2', name: 'box', multiplier: 10,
      barcode: '', isBaseUnit: false, isSaleUnit: false, isPurchaseUnit: true })).toBe('');
    expect(getSavedUnitBarcode(row, null)).toBe('A');
  });
  it('prints only active variants in the exact fashion model, with no duplicate selected row', () => {
    const selected = product('2', '123');
    const rows = [product('1', '123'), product('2', '123'), product('3', '123', 'standard'),
      product('4', '124'), product('5', '123', 'fashion', false)];
    expect(collectFashionBarcodeItems(selected, rows).map((v) => v.product.id)).toEqual(['1', '2']);
  });
  it('returns only the requested standard product outside fashion mode', () => {
    expect(collectFashionBarcodeItems(product('7', '', 'standard'), [product('9', '123')])).toHaveLength(1);
  });
});
