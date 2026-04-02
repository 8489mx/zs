import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { productsApi } from '@/features/products/api/products.api';
import type { ProductUnit } from '@/types/domain';
import type { ProductFormOutput } from '@/features/products/schemas/product.schema';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';

export type ProductFormValues = ProductFormOutput & { units?: ProductUnit[] };

function buildProductPayload(values: ProductFormValues) {
  const units = normalizeProductUnits(values.units, values.barcode || '').map((unit, index) => ({
    name: unit.name || (index === 0 ? 'قطعة' : ''),
    multiplier: Number(unit.multiplier || 1) || 1,
    barcode: unit.barcode || (index === 0 ? values.barcode || '' : ''),
    isBaseUnit: Boolean(unit.isBaseUnit),
    isSaleUnit: Boolean(unit.isSaleUnit),
    isPurchaseUnit: Boolean(unit.isPurchaseUnit)
  }));

  return {
    name: values.name,
    barcode: values.barcode || '',
    costPrice: Number(values.costPrice || 0),
    retailPrice: Number(values.retailPrice || 0),
    wholesalePrice: Number(values.wholesalePrice || 0),
    stock: Number(values.stock || 0),
    minStock: Number(values.minStock || 0),
    categoryId: values.categoryId || '',
    supplierId: values.supplierId || '',
    notes: values.notes || '',
    units,
    customerPrices: []
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
