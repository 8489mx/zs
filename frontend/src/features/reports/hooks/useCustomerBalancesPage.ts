import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { reportsApi, type CustomerBalancesQueryParams } from '@/features/reports/api/reports.api';

export function useCustomerBalancesPage(params: CustomerBalancesQueryParams) {
  return useQuery({
    queryKey: queryKeys.customerBalancesPage(buildQueryParamsKey(params, 'customer-balances')),
    queryFn: () => reportsApi.customerBalancesPage(params),
    placeholderData: keepPreviousData,
  });
}
