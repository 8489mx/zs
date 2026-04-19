import type { Product } from '@/types/domain';

const STYLE_CODE_START = 101;

function normalizeNumericStyleCode(value: unknown): number | null {
  const text = String(value || '').trim();
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getNextSequentialStyleCode(products: Product[], startAt = STYLE_CODE_START): string {
  const maxExisting = products.reduce((max, product) => {
    const current = normalizeNumericStyleCode(product.styleCode);
    return current !== null && current > max ? current : max;
  }, startAt - 1);
  return String(Math.max(startAt, maxExisting + 1));
}

export function getStyleCodeSequenceStart(): number {
  return STYLE_CODE_START;
}
