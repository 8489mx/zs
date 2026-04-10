import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { suppliersApi, type SuppliersListParams } from '@/features/suppliers/api/suppliers.api';

export function useSuppliersPageQuery(params: SuppliersListParams) {
  const paramsKey = buildQueryParamsKey({
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    filter: params.filter && params.filter !== 'all' ? params.filter : undefined,
  });
  return useQuery({
    queryKey: queryKeys.suppliersPage(paramsKey),
    queryFn: () => suppliersApi.listPage(params),
    placeholderData: keepPreviousData,
  });
}
