import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { buildInventorySummary, filterInventoryRows, type InventoryStatusFilter } from '@/features/inventory/utils/inventory-mappers';

export function useInventoryPage(search: string, statusFilter: InventoryStatusFilter) {
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: inventoryApi.products });
  const allProducts = useMemo(() => productsQuery.data || [], [productsQuery.data]);
  const rows = useMemo(() => filterInventoryRows(allProducts, search, statusFilter), [allProducts, search, statusFilter]);
  const inventory = useMemo(() => buildInventorySummary(allProducts), [allProducts]);
  return { productsQuery, rows, inventory };
}
