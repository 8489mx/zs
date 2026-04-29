import { describe, expect, it } from 'vitest';
import { addPosItem, getProductPrice, syncPosCartStock, updatePosItemQtyWithOptions } from '@/features/pos/lib/pos.domain';
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

function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

  it('uses date-only active offers for the cashier price', () => {
    const todayIso = localIsoDate();
    expect(getProductPrice({
      ...product,
      stock: 5,
      offers: [{ id: 'offer-1', type: 'percent', value: 10, minQty: 1, from: `${todayIso}T23:30:00.000Z`, to: `${todayIso}T01:30:00.000Z` }],
    }, 'retail', 1)).toBe(9);

    expect(getProductPrice({
      ...product,
      stock: 5,
      offers: [{ id: 'offer-1', type: 'percent', value: 10, minQty: 1, from: todayIso, to: todayIso }],
    }, 'retail', 1)).toBe(9);
  });

  it('applies active POS offers returned in camel-case API shape', () => {
    const cart = addPosItem([], {
      ...product,
      stock: 5,
      offers: [{ id: 'offer-1', type: 'fixed', value: 2, minQty: 1, from: localIsoDate(), to: null }],
    }, { priceType: 'retail' });

    expect(cart[0].price).toBe(8);
  });

  it('applies active POS offers returned in database-shaped API fields', () => {
    expect(getProductPrice({
      ...product,
      stock: 5,
      offers: [{ id: 'offer-1', offer_type: 'price', value: 7, min_qty: '1', start_date: localIsoDate(), end_date: null }],
    }, 'retail', 1)).toBe(7);
  });

  it('does not apply future or expired offers', () => {
    expect(getProductPrice({
      ...product,
      stock: 5,
      offers: [{ id: 'future-offer', type: 'percent', value: 50, minQty: 1, from: localIsoDate(1), to: null }],
    }, 'retail', 1)).toBe(10);

    expect(getProductPrice({
      ...product,
      stock: 5,
      offers: [{ id: 'expired-offer', type: 'percent', value: 50, minQty: 1, from: null, to: localIsoDate(-1) }],
    }, 'retail', 1)).toBe(10);
  });

  it('applies min_qty offers only after the threshold quantity', () => {
    const offeredProduct: Product = {
      ...product,
      stock: 5,
      offers: [{ id: 'qty-offer', offer_type: 'percent', value: 25, min_qty: 3, start_date: localIsoDate(), end_date: null }],
    };

    expect(getProductPrice(offeredProduct, 'retail', 2)).toBe(10);
    expect(getProductPrice(offeredProduct, 'retail', 3)).toBe(7.5);
  });
});
