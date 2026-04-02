import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { returnsApi, type ReturnsListParams } from '@/features/returns/api/returns.api';

export function useReturnsPage(params: ReturnsListParams) {
  const paramsKey = buildQueryParamsKey(params, 'default');
  return useQuery({
    queryKey: queryKeys.returnsPage(paramsKey),
    queryFn: () => returnsApi.listPage(params),
    placeholderData: keepPreviousData
  });
}
