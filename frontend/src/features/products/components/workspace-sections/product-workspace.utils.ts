import { useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { productsApi } from '@/features/products/api/products.api';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import type { Product, ProductCustomerPrice, ProductOffer, ProductUnit } from '@/types/domain';
import type { ProductFormOutput } from '@/features/products/schemas/product.schema';

export function toProductFormValues(product: Product): ProductFormOutput {
  return {
    name: product.name || '',
    barcode: product.barcode || '',
    costPrice: Number(product.costPrice || 0),
    retailPrice: Number(product.retailPrice || 0),
    wholesalePrice: Number(product.wholesalePrice || 0),
    stock: Number(product.stock || 0),
    minStock: Number(product.minStock || 0),
    categoryId: product.categoryId || '',
    supplierId: product.supplierId || '',
    notes: product.notes || ''
  };
}

export function normalizeCustomerPrices(product?: Product): ProductCustomerPrice[] {
  return Array.isArray(product?.customerPrices)
    ? product!.customerPrices!.map((entry) => ({ customerId: String(entry.customerId || ''), price: Number(entry.price || 0) }))
    : [];
}

export function buildUpdatePayload(values: ProductFormOutput, existingProduct: Product, units: ProductUnit[], customerPrices: ProductCustomerPrice[], offers?: ProductOffer[]) {
  return {
    name: values.name,
    barcode: values.barcode || '',
    costPrice: Number(values.costPrice || 0),
    retailPrice: Number(values.retailPrice || 0),
    wholesalePrice: Number(values.wholesalePrice || 0),
    minStock: Number(values.minStock || 0),
    categoryId: values.categoryId || '',
    supplierId: values.supplierId || '',
    notes: values.notes || '',
    units: normalizeProductUnits(units, values.barcode || '').map((unit, index) => ({
      id: unit.id || null,
      name: unit.name,
      multiplier: Number(unit.multiplier || 1) || 1,
      barcode: unit.barcode || (index === 0 ? values.barcode || '' : ''),
      isBaseUnit: Boolean(unit.isBaseUnit),
      isSaleUnit: Boolean(unit.isSaleUnit),
      isPurchaseUnit: Boolean(unit.isPurchaseUnit)
    })),
    offers: (offers ?? existingProduct.offers ?? []).map((offer) => ({
      id: offer.id,
      type: offer.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(offer.value || 0),
      from: offer.from || null,
      to: offer.to || null
    })),
    customerPrices: customerPrices.map((entry) => ({
      customerId: Number(entry.customerId || 0),
      price: Number(entry.price || 0)
    })).filter((entry) => entry.customerId > 0 && entry.price >= 0)
  };
}

export async function refetchAndSelectProduct(queryClient: ReturnType<typeof useQueryClient>, productId: string) {
  await invalidateCatalogDomain(queryClient, { includeProducts: true });
  const nextProducts = await queryClient.fetchQuery({ queryKey: queryKeys.products, queryFn: productsApi.list });
  return nextProducts.find((product) => String(product.id) === String(productId)) || null;
}
