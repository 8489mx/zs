import { describe, expect, it } from 'vitest';
import { addPosItem, syncPosCartStock, updatePosItemQtyWithOptions } from '@/features/pos/lib/pos.domain';
import type { Product } from '@/types/domain';

const product: Product = {
  id: 'p1',
  name: 'Tea',
  categoryId: '',
  supplierId: '',
  costPrice: 5,
  retailPrice: 10,
  wholesalePrice: 8,
  stock: 0,
  minStock: 0,
  notes: '',
  barcode: '123',
  units: [{ id: 'u1', name: 'قطعة', multiplier: 1, barcode: '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
};

describe('POS stock handling', () => {
  it('reports unavailable products without mutating the cart when negative stock sales are disabled', () => {
    expect(() => addPosItem([], product, { priceType: 'retail' })).toThrow('الصنف غير متاح للبيع حاليًا');
  });

  it('allows adding and increasing quantity below stock when negative stock sales are enabled', () => {
    const cart = addPosItem([], product, { priceType: 'retail', allowNegativeStockSales: true });
    const updated = updatePosItemQtyWithOptions(cart, cart[0].lineKey, 3, [product], { allowNegativeStockSales: true });

    expect(updated[0].qty).toBe(3);
    expect(updated[0].currentStock).toBe(0);
  });

  it('keeps below-stock cart lines during stock sync when negative stock sales are enabled', () => {
    const cart = addPosItem([], product, { priceType: 'retail', allowNegativeStockSales: true });
    const result = syncPosCartStock(cart, [product], { allowNegativeStockSales: true });

    expect(result.cart).toHaveLength(1);
    expect(result.removedCount).toBe(0);
    expect(result.clampedCount).toBe(0);
  });
});
