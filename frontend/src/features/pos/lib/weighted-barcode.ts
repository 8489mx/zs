import type { AppSettings, Product } from '@/types/domain';

export interface WeightedBarcodeConfig {
  enabled: boolean;
  prefix: string;
  productCodeLength: number;
  weightDigits: number;
  weightDecimals: number;
}

export interface WeightedBarcodeParseResult {
  rawCode: string;
  prefix: string;
  productCode: string;
  weightText: string;
  quantity: number;
}

export type WeightedProductMatch =
  | { status: 'empty' }
  | { status: 'not-found'; productCode: string }
  | { status: 'ambiguous'; productCode: string; matches: Array<{ product: Product; unitId?: string; unitName?: string | null; kind: 'product' | 'unit' | 'styleCode' }> }
  | { status: 'matched'; productCode: string; match: { product: Product; unitId?: string; unitName?: string | null; kind: 'product' | 'unit' | 'styleCode' } };

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function cleanDigits(value: unknown, fallback = '') {
  const text = String(value ?? '').replace(/\D/g, '');
  return text || fallback;
}

function uniqueCodeCandidates(value: string) {
  const normalized = cleanDigits(value);
  if (!normalized) return [];
  const stripped = normalized.replace(/^0+/, '') || '0';
  return Array.from(new Set([normalized, stripped]));
}

function valueMatchesCode(value: unknown, candidates: string[]) {
  const normalized = cleanDigits(value);
  if (!normalized) return false;
  const stripped = normalized.replace(/^0+/, '') || '0';
  return candidates.includes(normalized) || candidates.includes(stripped);
}

export function getWeightedBarcodeConfig(settings?: Partial<AppSettings> | null): WeightedBarcodeConfig {
  return {
    enabled: settings?.weightedBarcodeEnabled === true,
    prefix: cleanDigits(settings?.weightedBarcodePrefix, '21').slice(0, 4) || '21',
    productCodeLength: clampInt(settings?.weightedBarcodeProductCodeLength, 3, 8, 5),
    weightDigits: clampInt(settings?.weightedBarcodeWeightDigits, 3, 8, 5),
    weightDecimals: clampInt(settings?.weightedBarcodeWeightDecimals, 0, 3, 3),
  };
}

export function parseWeightedBarcode(rawCode: unknown, settings?: Partial<AppSettings> | null): WeightedBarcodeParseResult | null {
  const config = getWeightedBarcodeConfig(settings);
  if (!config.enabled) return null;

  const rawText = String(rawCode ?? '').trim();
  if (!/^\d+$/.test(rawText)) return null;
  if (!rawText.startsWith(config.prefix)) return null;

  const bodyLength = config.prefix.length + config.productCodeLength + config.weightDigits;
  const lengthWithCheckDigit = bodyLength + 1;
  if (rawText.length !== bodyLength && rawText.length !== lengthWithCheckDigit) return null;

  const productCodeStart = config.prefix.length;
  const weightStart = productCodeStart + config.productCodeLength;
  const productCode = rawText.slice(productCodeStart, weightStart);
  const weightText = rawText.slice(weightStart, weightStart + config.weightDigits);
  const weightNumber = Number(weightText);
  if (!productCode || !Number.isFinite(weightNumber) || weightNumber <= 0) return null;

  const quantity = Number((weightNumber / (10 ** config.weightDecimals)).toFixed(3));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  return {
    rawCode: rawText,
    prefix: config.prefix,
    productCode,
    weightText,
    quantity,
  };
}

export function matchProductByWeightedCode(products: Product[], rawProductCode: string): WeightedProductMatch {
  const candidates = uniqueCodeCandidates(rawProductCode);
  const productCode = candidates[0] || String(rawProductCode || '').trim();
  if (!candidates.length) return { status: 'empty' };

  const matches: Array<{ product: Product; unitId?: string; unitName?: string | null; kind: 'product' | 'unit' | 'styleCode' }> = [];

  for (const product of products || []) {
    if (valueMatchesCode(product.barcode, candidates)) {
      matches.push({ product, unitName: null, kind: 'product' });
    }

    if (valueMatchesCode(product.styleCode, candidates)) {
      matches.push({ product, unitName: null, kind: 'styleCode' });
    }

    for (const unit of (product.units || [])) {
      if (valueMatchesCode(unit.barcode, candidates)) {
        matches.push({ product, unitId: unit.id || '', unitName: unit.name || null, kind: 'unit' });
      }
    }
  }

  if (!matches.length) return { status: 'not-found', productCode };

  const preferredUnits = matches.filter((entry) => entry.kind === 'unit');
  const pool = preferredUnits.length ? preferredUnits : matches;
  const uniqueProductIds = Array.from(new Set(pool.map((entry) => String(entry.product.id))));
  if (uniqueProductIds.length > 1 || pool.length > 1) {
    return { status: 'ambiguous', productCode, matches: pool };
  }

  return { status: 'matched', productCode, match: pool[0] };
}

export function formatWeightedBarcodeQuantity(quantity: number) {
  return Number(quantity || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}
