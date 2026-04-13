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
    itemKind: product.itemKind === 'fashion' ? 'fashion' : 'standard',
    styleCode: product.styleCode || '',
    color: product.color || '',
    size: product.size || '',
    fashionColors: product.color || '',
    fashionSizes: product.size || '',
    variantStock: Number(product.stock || 0),
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

export function buildUpdatePayload(
  values: ProductFormOutput,
  existingProduct: Product,
  units: ProductUnit[],
  customerPrices: ProductCustomerPrice[],
  offers?: ProductOffer[]
) {
  const categoryId = values.categoryId ? Number(values.categoryId) : undefined;
  const supplierId = values.supplierId ? Number(values.supplierId) : undefined;
  const itemKind = values.itemKind === 'fashion' ? 'fashion' : 'standard';
  const normalizedUnits = itemKind === 'fashion'
    ? [{ name: 'قطعة', multiplier: 1, barcode: values.barcode || '', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }]
    : normalizeProductUnits(units, values.barcode || '').map((unit, index) => ({
        name: unit.name,
        multiplier: Number(unit.multiplier || 1) || 1,
        barcode: unit.barcode || (index === 0 ? values.barcode || '' : ''),
        isBaseUnit: Boolean(unit.isBaseUnit),
        isSaleUnit: Boolean(unit.isSaleUnit),
        isPurchaseUnit: Boolean(unit.isPurchaseUnit)
      }));

  return {
    name: values.name,
    barcode: values.barcode || '',
    itemKind,
    styleCode: values.styleCode || '',
    color: values.color || '',
    size: values.size || '',
    costPrice: Number(values.costPrice || 0),
    retailPrice: Number(values.retailPrice || 0),
    wholesalePrice: Number(values.wholesalePrice || 0),
    minStock: Number(values.minStock || 0),
    ...(categoryId ? { categoryId } : {}),
    ...(supplierId ? { supplierId } : {}),
    notes: values.notes || '',
    units: normalizedUnits,
    offers: (offers ?? existingProduct.offers ?? []).map((offer) => ({
      type: offer.type === 'price' ? 'price' : offer.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(offer.value || 0),
      minQty: Math.max(1, Number(offer.minQty || 1)),
      from: offer.from || null,
      to: offer.to || null
    })),
    customerPrices: customerPrices
      .map((entry) => ({
        customerId: Number(entry.customerId || 0),
        price: Number(entry.price || 0)
      }))
      .filter((entry) => entry.customerId > 0 && entry.price >= 0),
    fashionVariants: []
  };
}

export async function refetchAndSelectProduct(queryClient: ReturnType<typeof useQueryClient>, productId: string) {
  await invalidateCatalogDomain(queryClient, { includeProducts: true });
  const nextProducts = await queryClient.fetchQuery({ queryKey: queryKeys.products, queryFn: productsApi.list });
  return nextProducts.find((product) => String(product.id) === String(productId)) || null;
}
