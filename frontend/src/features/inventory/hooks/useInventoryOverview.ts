import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { resolveProductStatus, type StockStatus } from '@/lib/domain/inventory';

export function useInventoryOverview(search: string, statusFilter: 'all' | StockStatus) {
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: inventoryApi.products });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (productsQuery.data || []).filter((product) => {
      const matchesSearch = !q || [product.name, product.barcode, product.styleCode, product.color, product.size].some((value) => String(value || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
      const status = resolveProductStatus(product);
      if (statusFilter === 'all') return true;
      return status === statusFilter;
    });
  }, [productsQuery.data, search, statusFilter]);

  const inventory = useMemo(() => {
    const products = productsQuery.data || [];
    return {
      total: products.length,
      outOfStock: products.filter((product) => resolveProductStatus(product) === 'out'),
      lowStock: products.filter((product) => resolveProductStatus(product) === 'low'),
      inventoryValue: products.reduce((sum, product) => sum + (Number(product.stock || 0) * Number(product.costPrice || 0)), 0)
    };
  }, [productsQuery.data]);

  return { productsQuery, rows, inventory };
}
