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
    const matchingUnits = (product.units || []).filter((row) => String(row.barcode || '').trim() === value);
    const matchesBase = String(product.barcode || '').trim() === value;
    if (!matchingUnits.length && !matchesBase) continue;
    // One printed code must represent exactly one base-unit quantity.
    // Multiple unit identities with differing conversion rates are unsafe,
    // even if they belong to the same clothing SKU.
    const unitMultipliers = matchingUnits.map((unit) => Number(unit.multiplier));
    if (matchesBase) unitMultipliers.push(1);
    if (unitMultipliers.some((multiplier) => !Number.isFinite(multiplier) || multiplier <= 0) ||
      new Set(unitMultipliers).size !== 1) return { status: 'ambiguous' };
    matches.set(String(product.id), { product, baseQty: unitMultipliers[0] });
  }
  if (matches.size > 1) return { status: 'ambiguous' };
  if (matches.size === 1) {
    const only = matches.values().next().value!;
    return { status: 'matched', ...only };
  }
  if (products.some((product) => String(product.styleCode || '').trim() === value)) return { status: 'style_code' };
  return { status: 'missing' };
}
