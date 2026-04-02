import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { posApi } from '@/features/pos/api/pos.api';
import { getAvailableSaleProducts } from '@/features/pos/lib/pos.domain';

export function usePosCatalog(search: string) {
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: posApi.products });
  const customersQuery = useQuery({ queryKey: queryKeys.customers, queryFn: posApi.customers });
  const settingsQuery = useQuery({ queryKey: queryKeys.settings, queryFn: posApi.settings });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: posApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: posApi.locations });

  const saleProducts = useMemo(() => getAvailableSaleProducts(productsQuery.data || [], search), [productsQuery.data, search]);

  return {
    productsQuery,
    customersQuery,
    settingsQuery,
    branchesQuery,
    locationsQuery,
    saleProducts
  };
}
