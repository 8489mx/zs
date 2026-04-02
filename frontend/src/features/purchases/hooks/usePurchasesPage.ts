import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { purchasesApi, type PurchasesListParams } from '@/features/purchases/api/purchases.api';

function makeParamsKey(params: PurchasesListParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 25,
    search: params.search || '',
    filter: params.filter || 'all',
  });
}

export function usePurchasesPage(params: PurchasesListParams) {
  const purchasesQuery = useQuery({
    queryKey: queryKeys.purchasesPage(makeParamsKey(params)),
    queryFn: () => purchasesApi.listPage(params),
    placeholderData: (previous) => previous,
  });

  return {
    purchasesQuery,
    rows: purchasesQuery.data?.rows || [],
    pagination: purchasesQuery.data?.pagination,
    summary: purchasesQuery.data?.summary,
  };
}
