import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { referenceDataApi } from '@/services/reference-data.api';

export function usePurchaseComposerCatalog() {
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: purchasesApi.products });
  const suppliersQuery = useQuery({ queryKey: queryKeys.suppliers, queryFn: purchasesApi.suppliers });
  const settingsQuery = useQuery({ queryKey: queryKeys.settings, queryFn: referenceDataApi.settings });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: referenceDataApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });

  return {
    productsQuery,
    suppliersQuery,
    settingsQuery,
    branchesQuery,
    locationsQuery,
    isLoading: productsQuery.isLoading || suppliersQuery.isLoading || settingsQuery.isLoading || branchesQuery.isLoading || locationsQuery.isLoading,
    isError: productsQuery.isError || suppliersQuery.isError || settingsQuery.isError || branchesQuery.isError || locationsQuery.isError,
    error: productsQuery.error || suppliersQuery.error || settingsQuery.error || branchesQuery.error || locationsQuery.error
  };
}
