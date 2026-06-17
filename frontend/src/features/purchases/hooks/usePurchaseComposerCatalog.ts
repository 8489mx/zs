import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { referenceDataApi } from '@/services/reference-data.api';
import { sharedProductsApi } from '@/shared/api/products';

export function usePurchaseComposerCatalog() {
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: purchasesApi.products });
  const suppliersQuery = useQuery({ queryKey: queryKeys.suppliers, queryFn: purchasesApi.suppliers });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: sharedProductsApi.categories });
  const settingsQuery = useQuery({ queryKey: queryKeys.settings, queryFn: referenceDataApi.settings });
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: referenceDataApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });
  const purchasesQuery = useQuery({ queryKey: queryKeys.purchases, queryFn: purchasesApi.list });
  const costCentersQuery = useQuery({ queryKey: ['cost-centers'], queryFn: referenceDataApi.costCenters });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: referenceDataApi.projects });

  return {
    productsQuery,
    suppliersQuery,
    categoriesQuery,
    settingsQuery,
    branchesQuery,
    locationsQuery,
    purchasesQuery,
    costCentersQuery,
    projectsQuery,
    isLoading: productsQuery.isLoading || suppliersQuery.isLoading || categoriesQuery.isLoading || settingsQuery.isLoading || branchesQuery.isLoading || locationsQuery.isLoading || purchasesQuery.isLoading || costCentersQuery.isLoading || projectsQuery.isLoading,
    isError: productsQuery.isError || suppliersQuery.isError || categoriesQuery.isError || settingsQuery.isError || branchesQuery.isError || locationsQuery.isError || purchasesQuery.isError || costCentersQuery.isError || projectsQuery.isError,
    error: productsQuery.error || suppliersQuery.error || categoriesQuery.error || settingsQuery.error || branchesQuery.error || locationsQuery.error || purchasesQuery.error || costCentersQuery.error || projectsQuery.error
  };
}
