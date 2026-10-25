import type { Product, ProductUnit } from '@/types/domain';
import { resolveBarcodeUnit, type BarcodePrintItem } from '@/lib/barcode-labels';

/** Never fall back to the product's base barcode for a non-base unit. */
export function getSavedUnitBarcode(product: Product, unit?: ProductUnit | null): string {
  if (unit && !unit.isBaseUnit) return String(unit.barcode || '').trim();
  return String(unit?.barcode || product.barcode || '').trim();
}

/** Only active apparel siblings can share the model's label-print batch. */
export function collectFashionBarcodeItems(product: Product, allProducts: Product[]): BarcodePrintItem[] {
  const style = String(product.styleCode || '').trim();
  if (!style || product.itemKind !== 'fashion') {
    return [{ product, unit: resolveBarcodeUnit(product), copies: Math.max(1, Number(product.stock || 0)) }];
  }
  const byId = new Map<string, Product>();
  for (const row of allProducts) {
    if (row.itemKind !== 'fashion' || String(row.styleCode || '').trim() !== style ||
        row.isActive === false || row.is_active === false) continue;
    byId.set(String(row.id), row);
  }
  // The current item might have been saved moments before the catalog refresh.
  if (product.isActive !== false && product.is_active !== false) byId.set(String(product.id), product);
  return Array.from(byId.values()).sort((a, b) =>
    String(a.color || '').localeCompare(String(b.color || ''), 'ar') ||
    String(a.size || '').localeCompare(String(b.size || ''), 'ar'))
    .map((row) => ({ product: row, unit: resolveBarcodeUnit(row), copies: Math.max(1, Number(row.stock || 0)) }));
}
