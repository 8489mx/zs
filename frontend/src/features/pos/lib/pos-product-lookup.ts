import type { Product } from '@/types/domain';

export const POS_PRODUCT_LOOKUP_LIMIT = 30;
export const POS_PRODUCT_CACHE_LIMIT = 180;

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
