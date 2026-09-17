import { describe, expect, it } from 'vitest';
import {
  buildBarcodePreviewHtml,
  buildSingleLabelHtml,
  getBarcodePrintPreset,
  type BarcodePrintItem,
} from '@/lib/barcode-labels';
import type { Product } from '@/types/domain';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'أرز بسمتي درجة أولى 1 كجم',
  barcode: '6221234567890',
  costPrice: 65,
  retailPrice: 85,
  wholesalePrice: 78,
  stock: 120,
  minStock: 10,
  categoryId: 'cat-food',
  supplierId: 'sup-1',
  styleCode: 'RICE-01',
  itemKind: 'standard',
  notes: '',
  units: [
    {
      id: 'unit-1',
      name: 'كيلو',
      multiplier: 1,
      isBaseUnit: true,
      isSaleUnit: true,
      isPurchaseUnit: true,
      barcode: '6221234567890',
    },
  ],
};

describe('barcode-labels library', () => {
  it('contains regulatory shelf label presets', () => {
    const shelfPreset = getBarcodePrintPreset('thermal-shelf-60x30');
    expect(shelfPreset).toBeDefined();
    expect(shelfPreset.isShelfLabel).toBe(true);
    expect(shelfPreset.labelWidthMm).toBe(60);
    expect(shelfPreset.labelHeightMm).toBe(30);

    const foodPreset = getBarcodePrintPreset('thermal-food-50x40');
    expect(foodPreset).toBeDefined();
    expect(foodPreset.labelWidthMm).toBe(50);
    expect(foodPreset.labelHeightMm).toBe(40);
  });

  it('renders standard label with food packaging statement', () => {
    const preset = getBarcodePrintPreset('thermal-40x30');
    const html = buildSingleLabelHtml(mockProduct, mockProduct.units![0], preset, false, {
      showFoodStatement: true,
      packagingDate: '2026-09-17',
      expiryType: 'period',
      expiryPeriodMonths: 6,
    });

    expect(html).toContain('أرز بسمتي');
    expect(html).toContain('barcode-label-food-statement');
    expect(html).toContain('2026-09-17');
    expect(html).toContain('صلاحية: 6 شهر');
    expect(html).toContain('85');
  });

  it('renders complete regulatory statement with production date, net weight, and storage instructions', () => {
    const preset = getBarcodePrintPreset('thermal-food-50x40');
    const html = buildSingleLabelHtml(mockProduct, mockProduct.units![0], preset, false, {
      showFoodStatement: true,
      showProductionDate: true,
      productionDate: '2026-09-01',
      packagingDate: '2026-09-17',
      expiryType: 'date',
      expiryDate: '2027-03-01',
      showNetWeight: true,
      netWeightText: '1 كجم',
      foodStatementNote: 'يحفظ في مكان جاف وبارد',
      showUnit: true,
    });

    expect(html).toContain('إنتاج: <strong>2026-09-01</strong>');
    expect(html).toContain('تعبئة: <strong>2026-09-17</strong>');
    expect(html).toContain('انتهاء: 2027-03-01');
    expect(html).toContain('صافي: 1 كجم');
    expect(html).toContain('يحفظ في مكان جاف وبارد');
    expect(html).toContain('barcode-label-storage-note');
  });

  it('renders shelf edge talker layout with prominent price and tax note', () => {
    const preset = getBarcodePrintPreset('thermal-shelf-60x30');
    const html = buildSingleLabelHtml(mockProduct, mockProduct.units![0], preset, false, {
      showPrice: true,
      showUnit: true,
    });

    expect(html).toContain('barcode-label-shelf');
    expect(html).toContain('barcode-shelf-product-name');
    expect(html).toContain('شامل الضريبة المضافة');
    expect(html).toContain('لكل كيلو');
    expect(html).toContain('85');
  });

  it('generates multi-item preview for batch printing', () => {
    const items: BarcodePrintItem[] = [
      { product: mockProduct, unit: mockProduct.units![0], copies: 2 },
      {
        product: { ...mockProduct, id: 'prod-2', name: 'سكر أبيض ناعم 1 كجم', barcode: '6229999999999' },
        copies: 2,
      },
    ];

    const preview = buildBarcodePreviewHtml({
      product: mockProduct,
      unit: mockProduct.units![0],
      presetId: 'thermal-40x30',
      items,
      previewMode: 'sheet',
    });

    expect(preview).toContain('أرز بسمتي');
    expect(preview).toContain('سكر أبيض ناعم');
  });
});
