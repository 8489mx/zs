import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { productsApi } from '@/features/products/api/products.api';
import { normalizeArabicInput, normalizeArabicSearchKey } from '@/lib/arabic-normalization';
import type { ProductUnit } from '@/types/domain';
import type { ProductFormOutput } from '@/features/products/schemas/product.schema';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';

export type ProductFormValues = ProductFormOutput & {
  units?: ProductUnit[];
  fashionVariantRows?: Array<{ color: string; size: string; barcode?: string; stock?: number }>;
  groupedEntryEnabled?: boolean;
};

function splitTokens(value: string | undefined) {
  return String(value || '')
    .split(/[\n،,|/]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildFashionVariants(values: ProductFormValues) {
  const seededRows = Array.isArray(values.fashionVariantRows)
    ? values.fashionVariantRows
        .map((row) => ({
          color: normalizeArabicInput(row.color),
          size: normalizeArabicInput(row.size),
          barcode: String(row.barcode || '').trim(),
          stock: Math.max(0, Number(row.stock || 0)),
        }))
        .filter((row) => row.color || row.size)
    : [];
  if (seededRows.length) {
    const seen = new Set<string>();
    return seededRows.filter((row) => {
      const key = `${normalizeArabicSearchKey(row.color)}::${normalizeArabicSearchKey(row.size)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const colors = splitTokens(values.fashionColors);
  const sizes = splitTokens(values.fashionSizes);
  const defaultStock = Number(values.variantStock || 0);
  const normalizedColors = colors.length ? colors : [''];
  const normalizedSizes = sizes.length ? sizes : [''];
  return normalizedColors.flatMap((color) => normalizedSizes.map((size) => ({ color, size, barcode: '', stock: defaultStock }))).filter((row) => row.color || row.size);
}

function buildProductPayload(values: ProductFormValues) {
  const itemKind = values.itemKind === 'fashion' ? 'fashion' : 'standard';
  const groupedEntryEnabled = Boolean(values.groupedEntryEnabled || itemKind === 'fashion');
  const units = groupedEntryEnabled
    ? [{ name: 'قطعة', multiplier: 1, barcode: '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }]
    : normalizeProductUnits(values.units, values.barcode || '').map((unit, index) => ({
        name: unit.name || (index === 0 ? 'قطعة' : ''),
        multiplier: Number(unit.multiplier || 1) || 1,
        barcode: unit.barcode || (index === 0 ? values.barcode || '' : ''),
        isBaseUnit: Boolean(unit.isBaseUnit),
        isSaleUnit: Boolean(unit.isSaleUnit),
        isPurchaseUnit: Boolean(unit.isPurchaseUnit)
      }));

  const fashionVariants = groupedEntryEnabled ? buildFashionVariants(values) : [];

  return {
    name: normalizeArabicInput(values.name),
    barcode: groupedEntryEnabled ? '' : (values.barcode || ''),
    itemKind,
    styleCode: groupedEntryEnabled ? (values.styleCode || '') : (values.styleCode || ''),
    color: groupedEntryEnabled ? '' : normalizeArabicInput(values.color || ''),
    size: groupedEntryEnabled ? '' : normalizeArabicInput(values.size || ''),
    costPrice: Number(values.costPrice || 0),
    retailPrice: Number(values.retailPrice || 0),
    wholesalePrice: Number(values.wholesalePrice || 0),
    stock: groupedEntryEnabled ? 0 : Number(values.stock || 0),
    minStock: Number(values.minStock || 0),
    categoryId: values.categoryId || '',
    supplierId: values.supplierId || '',
    notes: normalizeArabicInput(values.notes || ''),
    units,
    customerPrices: [],
    fashionVariants,
  };
}

export function useCreateProductMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsApi.create(buildProductPayload(values)),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      onSuccess?.();
    }
  });
}
