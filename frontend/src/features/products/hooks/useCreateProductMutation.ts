import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { productsApi } from '@/features/products/api/products.api';
import type { ProductUnit } from '@/types/domain';
import type { ProductFormOutput } from '@/features/products/schemas/product.schema';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';

export type ProductFormValues = ProductFormOutput & { units?: ProductUnit[] };

function splitTokens(value: string | undefined) {
  return String(value || '')
    .split(/[\n،,|/]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildFashionVariants(values: ProductFormValues) {
  const colors = splitTokens(values.fashionColors);
  const sizes = splitTokens(values.fashionSizes);
  const defaultStock = Number(values.variantStock || 0);
  return colors.flatMap((color) => sizes.map((size) => ({ color, size, stock: defaultStock })));
}

function buildProductPayload(values: ProductFormValues) {
  const itemKind = values.itemKind === 'fashion' ? 'fashion' : 'standard';
  const units = itemKind === 'fashion'
    ? [{ name: 'قطعة', multiplier: 1, barcode: '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }]
    : normalizeProductUnits(values.units, values.barcode || '').map((unit, index) => ({
        name: unit.name || (index === 0 ? 'قطعة' : ''),
        multiplier: Number(unit.multiplier || 1) || 1,
        barcode: unit.barcode || (index === 0 ? values.barcode || '' : ''),
        isBaseUnit: Boolean(unit.isBaseUnit),
        isSaleUnit: Boolean(unit.isSaleUnit),
        isPurchaseUnit: Boolean(unit.isPurchaseUnit)
      }));

  const fashionVariants = itemKind === 'fashion' ? buildFashionVariants(values) : [];

  return {
    name: values.name,
    barcode: itemKind === 'fashion' ? '' : (values.barcode || ''),
    itemKind,
    styleCode: values.styleCode || '',
    color: itemKind === 'fashion' ? '' : (values.color || ''),
    size: itemKind === 'fashion' ? '' : (values.size || ''),
    costPrice: Number(values.costPrice || 0),
    retailPrice: Number(values.retailPrice || 0),
    wholesalePrice: Number(values.wholesalePrice || 0),
    stock: itemKind === 'fashion' ? 0 : Number(values.stock || 0),
    minStock: Number(values.minStock || 0),
    categoryId: values.categoryId || '',
    supplierId: values.supplierId || '',
    notes: values.notes || '',
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
