import { describe, expect, it } from 'vitest';
import { buildCountLocationStockMap, filterCountableProductsAtLocation } from './count-location-scoping';
const products = [{ id: '1' }, { id: '2' }];
describe('warehouse-specific count scope', () => {
  it('does not show global products when selected warehouse is empty', () => {
    expect(filterCountableProductsAtLocation(products, buildCountLocationStockMap('9', []))).toEqual([]);
  });
  it('keeps zero-qty assigned variants and excludes other locations', () => {
    const rows = buildCountLocationStockMap('9', [
      { productId: 1, locationId: 9, qty: 0 }, { productId: 2, locationId: 10, qty: 6 },
    ]);
    expect(rows?.get('1')).toBe(0);
    expect(filterCountableProductsAtLocation(products, rows)).toEqual([{ id: '1' }]);
  });
  it('does not treat unavailable stock data as global inventory', () => {
    expect(buildCountLocationStockMap('9', undefined)).toBeNull();
    expect(filterCountableProductsAtLocation(products, null)).toEqual([]);
  });
});
