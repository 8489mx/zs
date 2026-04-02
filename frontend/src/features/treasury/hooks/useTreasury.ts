import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { treasuryApi, type TreasuryTransactionsQueryParams } from '@/features/treasury/api/treasury.api';

function makeParamsKey(params: TreasuryTransactionsQueryParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 25,
    search: params.search || '',
    filter: params.filter || 'all',
  });
}

export function useTreasury(params: TreasuryTransactionsQueryParams) {
  return useQuery({
    queryKey: queryKeys.treasuryPage(makeParamsKey(params)),
    queryFn: () => treasuryApi.list(params),
    placeholderData: (previous) => previous,
  });
}
