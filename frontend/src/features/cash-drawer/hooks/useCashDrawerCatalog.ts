import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { referenceDataApi } from '@/services/reference-data.api';

export function useCashDrawerCatalog() {
  const branchesQuery = useQuery({ queryKey: queryKeys.branches, queryFn: referenceDataApi.branches });
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });
  return {
    branchesQuery,
    locationsQuery,
    branches: branchesQuery.data || [],
    locations: locationsQuery.data || []
  };
}
