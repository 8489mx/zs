import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { referenceDataApi } from '@/services/reference-data.api';

export function useInventoryActionCatalog() {
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: inventoryApi.products });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: referenceDataApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });

  return {
    productsQuery,
    branchesQuery,
    locationsQuery,
    isLoading: productsQuery.isLoading || branchesQuery.isLoading || locationsQuery.isLoading,
    isError: productsQuery.isError || branchesQuery.isError || locationsQuery.isError,
    error: productsQuery.error || branchesQuery.error || locationsQuery.error
  };
}
