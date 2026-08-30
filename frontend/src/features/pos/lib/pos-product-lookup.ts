import type { Product } from '@/types/domain';

export const POS_PRODUCT_LOOKUP_LIMIT = 300;
export const POS_PRODUCT_CACHE_LIMIT = 1200;

export function isLikelyBarcodeQuery(value: string) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 3 || /\s/.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return true;
  return /^[A-Za-z0-9._/-]+$/.test(trimmed) && (/\d/.test(trimmed) || trimmed.length >= 8);
}

export function mergeLookupProducts(...groups: Array<Product[] | null | undefined>) {
  const merged: Product[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const product of group || []) {
      const key = String(product.id || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(product);
    }
  }

  return merged;
}

export function createProductBarcodeMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of products) {
    if (p.barcode) {
      map.set(p.barcode.trim().toLowerCase(), p);
    }
    if (p.units) {
      for (const u of p.units) {
        if (u.barcode) {
          map.set(u.barcode.trim().toLowerCase(), p);
        }
      }
    }
  }
  return map;
}
