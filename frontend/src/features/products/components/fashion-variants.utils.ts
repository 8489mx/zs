import { normalizeArabicInput, normalizeArabicSearchKey } from '@/lib/arabic-normalization';

export interface FashionVariantDraft {
  color: string;
  size: string;
  barcode: string;
  stock: number;
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

  for (const color of normalizedColors) {
    for (const size of normalizedSizes) {
      if (!String(color || '').trim() && !String(size || '').trim()) continue;
      const key = makeVariantKey(color, size);
      const existing = existingMap.get(key);
      nextRows.push(existing ? { ...existing, color, size } : { color, size, barcode: '', stock: Number(defaultStock || 0) });
    }
  }

  return nextRows;
}
