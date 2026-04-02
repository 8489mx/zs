import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { cashDrawerApi, type CashDrawerListParams } from '@/features/cash-drawer/api/cash-drawer.api';

function buildParamsKey(params: CashDrawerListParams) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.filter && params.filter !== 'all') searchParams.set('filter', params.filter);
  return searchParams.toString() || 'default';
}

export function useCashierShifts(params: CashDrawerListParams) {
  const paramsKey = buildParamsKey(params);
  return useQuery({
    queryKey: queryKeys.cashierShiftsPage(paramsKey),
    queryFn: () => cashDrawerApi.listPage(params),
    placeholderData: keepPreviousData,
  });
}
