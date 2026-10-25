import type { Product } from '@/types/domain';
type CountLocationStock = { productId: string | number; locationId: string | number; qty: number };
/** null means unavailable, empty Map means selected warehouse has no rows. */
export function buildCountLocationStockMap(locationId: string, stocks: CountLocationStock[] | undefined): Map<string, number> | null {
  if (!locationId || !Array.isArray(stocks)) return null;
  const scoped = new Map<string, number>();
  for (const stock of stocks) {
    if (String(stock.locationId) === locationId) scoped.set(String(stock.productId), Number(stock.qty || 0));
  }
  return scoped;
}
export function filterCountableProductsAtLocation<T extends Pick<Product, 'id'>>(products: T[], stocks: Map<string, number> | null): T[] {
  return stocks === null ? [] : products.filter((product) => stocks.has(String(product.id)));
}
