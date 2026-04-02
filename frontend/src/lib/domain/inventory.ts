import type { Product, ProductUnit } from '@/types/domain';

export type StockStatus = 'out' | 'low' | 'healthy';

export function resolveProductStatus(product: Product): StockStatus {
  const stock = Number(product.stock || 0);
  const minStock = Number(product.minStock || 0);
  if (stock <= 0) return 'out';
  if (stock <= minStock) return 'low';
  return 'healthy';
}

export function getSaleUnit(product: Product): ProductUnit {
  return product.units.find((unit) => unit.isSaleUnit) || product.units[0] || {
    id: '',
    name: 'قطعة',
    multiplier: 1,
    barcode: product.barcode,
    isBaseUnit: true,
    isSaleUnit: true,
    isPurchaseUnit: true
  };
}

export function getSaleStockLimit(product: Product) {
  const saleUnit = getSaleUnit(product);
  return Math.floor(Number(product.stock || 0) / Math.max(Number(saleUnit.multiplier || 1), 1));
}

export function isSellableProduct(product: Product) {
  return getSaleStockLimit(product) > 0;
}
