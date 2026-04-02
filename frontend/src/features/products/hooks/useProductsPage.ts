import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { productsApi, type ProductsListParams } from '@/features/products/api/products.api';
import { useProductsPageQuery } from '@/features/products/hooks/useProductsPageQuery';
import { getProductMetrics } from '@/features/products/utils/product-mappers';

export function useProductsPage(search = '', params: Partial<ProductsListParams> = {}) {
  const productsQuery = useProductsPageQuery({ page: 1, pageSize: 20, view: 'all', q: search, ...params });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: productsApi.categories });
  const suppliersQuery = useQuery({ queryKey: queryKeys.suppliers, queryFn: productsApi.suppliers });

  const categoryNames = useMemo(
    () => Object.fromEntries((categoriesQuery.data || []).map((category) => [category.id, category.name])),
    [categoriesQuery.data]
  );
  const supplierNames = useMemo(
    () => Object.fromEntries((suppliersQuery.data || []).map((supplier) => [supplier.id, supplier.name])),
    [suppliersQuery.data]
  );

  const rows = useMemo(() => productsQuery.data?.products || [], [productsQuery.data?.products]);
  const summary = productsQuery.data?.summary;
  const metrics = useMemo(
    () => ({
      ...getProductMetrics(rows),
      totalProducts: Number(summary?.totalProducts || rows.length),
      lowStockCount: Number(summary?.lowStockCount || 0),
      outOfStockCount: Number(summary?.outOfStockCount || 0),
      inventoryCost: Number(summary?.inventoryCost || 0),
      inventorySaleValue: Number(summary?.inventorySaleValue || 0),
      activeOffersCount: Number(summary?.activeOffersCount || 0),
      customerPriceCount: Number(summary?.customerPriceCount || 0),
    }),
    [rows, summary]
  );

  return { productsQuery, categoriesQuery, suppliersQuery, filteredProducts: rows, metrics, categoryNames, supplierNames };
}
