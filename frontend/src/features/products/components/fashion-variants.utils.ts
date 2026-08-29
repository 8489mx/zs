import { normalizeArabicInput, normalizeArabicSearchKey } from '@/lib/arabic-normalization';

export interface FashionVariantDraft {
  id?: string;
  color: string;
  size: string;
  barcode: string;
  stock: number;
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  minStock?: number;
  sku?: string;
}

function makeVariantKey(color: string, size: string) {
  return `${normalizeArabicSearchKey(String(color || ''))}::${normalizeArabicSearchKey(String(size || ''))}`;
}

export function splitFashionTokens(value: string | undefined) {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const rawEntry of String(value || '').split(/(?:\s*[\n،,|\/.\-]\s*)+/g)) {
    const entry = normalizeArabicInput(rawEntry);
    if (!entry) continue;
    const key = normalizeArabicSearchKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(entry);
  }
  return tokens;
}

export function mergeFashionTokens(currentValue: string | undefined, additions: string[]) {
  return splitFashionTokens([...(splitFashionTokens(currentValue)), ...additions.map((value) => normalizeArabicInput(value))].join('، ')).join('، ');
}

export function buildFashionVariantDrafts(
  colors: string[],
  sizes: string[],
  existingRows: FashionVariantDraft[],
  defaultStock: number,
): FashionVariantDraft[] {
  const existingMap = new Map(existingRows.map((row) => [makeVariantKey(row.color, row.size), row]));
  const nextRows: FashionVariantDraft[] = [];
  const normalizedColors = colors.length ? colors : [''];
  const normalizedSizes = sizes.length ? sizes : [''];

  if (colors.length || sizes.length) {
    for (const color of normalizedColors) {
      for (const size of normalizedSizes) {
        if (!String(color || '').trim() && !String(size || '').trim()) continue;
        const key = makeVariantKey(color, size);
        const existing = existingMap.get(key);
        const id = existing?.id || `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        nextRows.push(existing ? { ...existing, color, size } : { id, color, size, barcode: '', stock: Number(defaultStock || 0) });
      }
    }
  }

  // Preserve any manually added rows that might have custom color/size or empty rows in progress
  for (const row of existingRows) {
    const key = makeVariantKey(row.color, row.size);
    if (!nextRows.some((nr) => makeVariantKey(nr.color, nr.size) === key)) {
      const id = row.id || `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      nextRows.push({ ...row, id });
    }
  }

  return nextRows;
}
