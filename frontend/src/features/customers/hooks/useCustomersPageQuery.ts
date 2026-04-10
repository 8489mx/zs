import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { customersApi, type CustomersListParams } from '@/features/customers/api/customers.api';

export function useCustomersPageQuery(params: CustomersListParams) {
  const paramsKey = buildQueryParamsKey({
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    filter: params.filter && params.filter !== 'all' ? params.filter : undefined,
  });
  return useQuery({
    queryKey: queryKeys.customersPage(paramsKey),
    queryFn: () => customersApi.listPage(params),
    placeholderData: keepPreviousData,
  });
}
