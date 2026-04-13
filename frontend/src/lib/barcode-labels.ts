import { buildCode128Svg, normalizeCode128Value, productUnitsWithFallback } from '@/lib/barcode';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import type { Product, ProductUnit } from '@/types/domain';

export type BarcodePrintFamily = 'sheet' | 'thermal';

export interface BarcodePrintPreset {
  id: string;
  family: BarcodePrintFamily;
  label: string;
  pageLabel: string;
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  gapMm: number;
  marginMm: number;
  pageWidthMm?: number;
  pageHeightMm?: number;
  maxLabelsPerPage: number;
}

export interface BarcodePrintConfig {
  presetId: string;
  copies: number;
  labelsPerPage: number;
}

const SHEET_PRESETS: BarcodePrintPreset[] = [
  { id: 'a4-24', family: 'sheet', label: 'A4 / 24 labels', pageLabel: 'A4 sticker sheet', labelWidthMm: 63.5, labelHeightMm: 33.9, columns: 3, rows: 8, gapMm: 2.5, marginMm: 8, pageWidthMm: 210, pageHeightMm: 297, maxLabelsPerPage: 24 },
  { id: 'a4-40', family: 'sheet', label: 'A4 / 40 labels', pageLabel: 'A4 sticker sheet', labelWidthMm: 48, labelHeightMm: 25.4, columns: 4, rows: 10, gapMm: 2, marginMm: 7, pageWidthMm: 210, pageHeightMm: 297, maxLabelsPerPage: 40 },
  { id: 'a4-48', family: 'sheet', label: 'A4 / 48 labels', pageLabel: 'A4 sticker sheet', labelWidthMm: 45.7, labelHeightMm: 21.2, columns: 4, rows: 12, gapMm: 2, marginMm: 7, pageWidthMm: 210, pageHeightMm: 297, maxLabelsPerPage: 48 },
  { id: 'a4-65', family: 'sheet', label: 'A4 / 65 labels', pageLabel: 'A4 sticker sheet', labelWidthMm: 38.1, labelHeightMm: 21.2, columns: 5, rows: 13, gapMm: 2, marginMm: 6, pageWidthMm: 210, pageHeightMm: 297, maxLabelsPerPage: 65 },
  { id: 'a4-100', family: 'sheet', label: 'A4 / 100 labels', pageLabel: 'A4 sticker sheet', labelWidthMm: 38.1, labelHeightMm: 19.1, columns: 5, rows: 20, gapMm: 1.5, marginMm: 6, pageWidthMm: 210, pageHeightMm: 297, maxLabelsPerPage: 100 },
];

const THERMAL_PRESETS: BarcodePrintPreset[] = [
  { id: 'thermal-40x30', family: 'thermal', label: '40x30 mm', pageLabel: 'Thermal label', labelWidthMm: 40, labelHeightMm: 30, columns: 1, rows: 1, gapMm: 2, marginMm: 2, pageWidthMm: 40, maxLabelsPerPage: 8 },
  { id: 'thermal-50x25', family: 'thermal', label: '50x25 mm', pageLabel: 'Thermal label', labelWidthMm: 50, labelHeightMm: 25, columns: 1, rows: 1, gapMm: 2, marginMm: 2, pageWidthMm: 50, maxLabelsPerPage: 8 },
  { id: 'thermal-60x40', family: 'thermal', label: '60x40 mm', pageLabel: 'Thermal label', labelWidthMm: 60, labelHeightMm: 40, columns: 1, rows: 1, gapMm: 2, marginMm: 2, pageWidthMm: 60, maxLabelsPerPage: 8 },
  { id: 'thermal-58-roll', family: 'thermal', label: '58mm roll', pageLabel: 'Thermal label', labelWidthMm: 54, labelHeightMm: 35, columns: 1, rows: 1, gapMm: 2, marginMm: 2, pageWidthMm: 58, maxLabelsPerPage: 8 },
  { id: 'thermal-80-roll', family: 'thermal', label: '80mm roll', pageLabel: 'Thermal label', labelWidthMm: 76, labelHeightMm: 45, columns: 1, rows: 1, gapMm: 2, marginMm: 2, pageWidthMm: 80, maxLabelsPerPage: 8 },
];

export const BARCODE_PRINT_PRESETS = [...SHEET_PRESETS, ...THERMAL_PRESETS];
export const DEFAULT_BARCODE_PRINT_PRESET_ID = 'a4-40';

export function getBarcodePrintPreset(presetId: string) {
  return BARCODE_PRINT_PRESETS.find((preset) => preset.id === presetId) || BARCODE_PRINT_PRESETS[0];
}

export function getBarcodePrintPresetsByFamily(family: BarcodePrintFamily) {
  return BARCODE_PRINT_PRESETS.filter((preset) => preset.family === family);
}

export function resolveBarcodeUnit(product: Product, requestedUnit?: ProductUnit | null) {
  const units = productUnitsWithFallback(product);
  return requestedUnit || units.find((unit) => unit.isBaseUnit) || units[0];
}

export function getBarcodeCardData(product: Product, unit?: ProductUnit | null) {
  const effectiveUnit = resolveBarcodeUnit(product, unit);
  const barcode = normalizeCode128Value(effectiveUnit?.barcode || product.barcode);
  const svg = barcode ? buildCode128Svg(barcode) : '';
  const unitFactor = Math.max(1, Number(effectiveUnit?.multiplier || 1));
  return {
    unit: effectiveUnit,
    barcode,
    barcodeSvg: svg,
    unitFactor,
    priceText: formatCurrency(Number(product.retailPrice || 0) * unitFactor),
  };
}

function buildSingleLabelHtml(product: Product, unit?: ProductUnit | null, compact = false) {
  const card = getBarcodeCardData(product, unit);
  return `
    <div class="barcode-label-card ${compact ? 'compact' : ''}">
      <div class="barcode-label-name">${escapeHtml(product.name || '-')}</div>
      <div class="barcode-label-unit">${escapeHtml(card.unit?.name || 'قطعة')}</div>
      <div class="barcode-label-svg">${card.barcodeSvg || '<div class="barcode-label-missing">بدون باركود</div>'}</div>
      <div class="barcode-label-text">${escapeHtml(card.barcode || '—')}</div>
      <div class="barcode-label-price">${escapeHtml(card.priceText)}</div>
    </div>
  `;
}

export function buildBarcodePreviewHtml(options: { product: Product; unit?: ProductUnit | null; presetId: string; labelsPerPage?: number }) {
  const preset = getBarcodePrintPreset(options.presetId);
  const labelsPerPage = Math.max(1, Math.min(Number(options.labelsPerPage || preset.maxLabelsPerPage), preset.maxLabelsPerPage));
  const previewItems = Array.from({ length: labelsPerPage }, () => buildSingleLabelHtml(options.product, options.unit, preset.family === 'thermal')).join('');
  return `
    <div class="barcode-preview-sheet barcode-preview-sheet-${preset.family}" style="padding:${preset.marginMm}mm;gap:${preset.gapMm}mm;grid-template-columns:repeat(${preset.family === 'sheet' ? preset.columns : 1}, minmax(0, 1fr));">
      ${previewItems}
    </div>
  `;
}

export function printProductBarcodeLabels(product: Product, unit: ProductUnit | null | undefined, config: BarcodePrintConfig) {
  const preset = getBarcodePrintPreset(config.presetId || DEFAULT_BARCODE_PRINT_PRESET_ID);
  const copies = Math.max(1, Number(config.copies || 1));
  const labelsPerPage = Math.max(1, Math.min(Number(config.labelsPerPage || preset.maxLabelsPerPage), preset.maxLabelsPerPage));
  const perPage = preset.family === 'sheet' ? labelsPerPage : labelsPerPage;
  const pages = Math.max(1, Math.ceil(copies / perPage));
  const pageHtml = Array.from({ length: pages }, (_, pageIndex) => {
    const start = pageIndex * perPage;
    const count = Math.min(perPage, copies - start);
    const labels = Array.from({ length: count }, () => buildSingleLabelHtml(product, unit, preset.family === 'thermal')).join('');
    return `
      <section class="barcode-print-page ${pageIndex < pages - 1 ? 'page-break' : ''}">
        <div class="barcode-print-grid barcode-print-grid-${preset.family}" style="padding:${preset.marginMm}mm;gap:${preset.gapMm}mm;grid-template-columns:repeat(${preset.family === 'sheet' ? preset.columns : 1}, minmax(0, 1fr));">
          ${labels}
        </div>
      </section>
    `;
  }).join('');

  const thermalPageRule = preset.family === 'thermal'
    ? `@page { size: ${preset.pageWidthMm || preset.labelWidthMm}mm auto; margin: ${preset.marginMm}mm; }`
    : '';

  printHtmlDocument('ملصقات الباركود', pageHtml, {
    subtitle: `${preset.pageLabel} · ${preset.label}`,
    pageSize: preset.family === 'sheet' ? 'A4' : 'auto',
    orientation: 'portrait',
    extraStyles: `
      ${thermalPageRule}
      .barcode-print-page{width:100%;}
      .barcode-print-page.page-break{page-break-after:always;break-after:page;}
      .barcode-print-grid{display:grid;align-items:stretch;}
      .barcode-label-card{border:1px dashed #94a3b8;border-radius:10px;padding:2.5mm;text-align:center;display:flex;flex-direction:column;justify-content:center;min-height:${preset.labelHeightMm}mm;height:${preset.labelHeightMm}mm;background:#fff;overflow:hidden;}
      .barcode-label-card.compact{padding:2mm;}
      .barcode-label-name{font-size:12px;font-weight:700;line-height:1.25;max-height:2.6em;overflow:hidden;}
      .barcode-label-unit{font-size:11px;color:#475569;margin-top:1mm;}
      .barcode-label-svg{margin:1.5mm 0;height:${Math.max(12, preset.labelHeightMm * 0.38)}mm;display:flex;align-items:center;justify-content:center;}
      .barcode-label-svg svg{width:100%;height:100%;display:block;}
      .barcode-label-text{font-size:11px;font-weight:700;direction:ltr;letter-spacing:.7px;}
      .barcode-label-price{font-size:11px;font-weight:700;margin-top:1mm;}
      .barcode-label-missing{font-size:11px;color:#b91c1c;display:flex;align-items:center;justify-content:center;height:100%;}
    `,
  });
}
