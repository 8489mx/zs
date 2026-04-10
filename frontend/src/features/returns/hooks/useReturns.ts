import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { returnsApi } from '@/features/returns/api/returns.api';

export function useReturns() {
  return useQuery({ queryKey: queryKeys.returns, queryFn: returnsApi.list });
}
