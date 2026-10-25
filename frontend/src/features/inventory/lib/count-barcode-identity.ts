import type { Product } from '@/types/domain';
export type CountBarcodeResolution =
  | { status: 'matched'; product: Product; baseQty: number }
  | { status: 'ambiguous' | 'style_code' | 'missing' };
/** Model code labels a group, not a physical size/color; unit barcode counts in base pieces. */
export function classifyStockCountBarcodeScan(barcode: string, products: Product[]): CountBarcodeResolution {
  const value = barcode.trim();
  if (!value) return { status: 'missing' };
  const matches = new Map<string, { product: Product; baseQty: number }>();
  for (const product of products) {
    if (product.isActive === false || product.is_active === false) continue;
    const unit = (product.units || []).find((row) => String(row.barcode || '').trim() === value);
    const matchesBase = String(product.barcode || '').trim() === value;
    if (!unit && !matchesBase) continue;
    const multiplier = unit ? Number(unit.multiplier) : 1;
    if (!Number.isFinite(multiplier) || multiplier <= 0) return { status: 'ambiguous' };
    matches.set(String(product.id), { product, baseQty: multiplier });
  }
  if (matches.size > 1) return { status: 'ambiguous' };
  if (matches.size === 1) {
    const only = matches.values().next().value!;
    return { status: 'matched', ...only };
  }
  if (products.some((product) => String(product.styleCode || '').trim() === value)) return { status: 'style_code' };
  return { status: 'missing' };
}
