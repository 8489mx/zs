import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { posApi } from '@/features/pos/api/pos.api';
import { getAvailableSaleProducts } from '@/features/pos/lib/pos.domain';

const posReferenceStaleTime = 45_000;

export function usePosCatalog(search: string, locationId: string) {
  const productsQuery = useQuery({ queryKey: queryKeys.posProducts(locationId), queryFn: () => posApi.products(locationId), staleTime: 20_000 });
  const customersQuery = useQuery({ queryKey: queryKeys.posCustomers, queryFn: posApi.customers, staleTime: posReferenceStaleTime });
  const settingsQuery = useQuery({ queryKey: queryKeys.posSettings, queryFn: posApi.settings, staleTime: posReferenceStaleTime });
  const branchesQuery = useQuery({ queryKey: queryKeys.posBranches, queryFn: posApi.branches, staleTime: posReferenceStaleTime });
  const locationsQuery = useQuery({ queryKey: queryKeys.posLocations, queryFn: posApi.locations, staleTime: posReferenceStaleTime });

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
