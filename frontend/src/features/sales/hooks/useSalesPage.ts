import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { isSellableProduct } from '@/lib/domain/inventory';
import { salesApi, type SalesListParams } from '@/features/sales/api/sales.api';

function makeParamsKey(params: SalesListParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 30,
    search: params.search || '',
    filter: params.filter || 'all',
  });
}

export function useSalesPage(params: SalesListParams) {
  const salesQuery = useQuery({
    queryKey: queryKeys.salesPage(makeParamsKey(params)),
    queryFn: () => salesApi.listPage(params),
    placeholderData: (previous) => previous,
  });
  const productsQuery = useQuery({ queryKey: queryKeys.products, queryFn: salesApi.products });

  const availableProducts = useMemo(() => (productsQuery.data || []).filter(isSellableProduct), [productsQuery.data]);

  return {
    salesQuery,
    productsQuery,
    availableProducts,
    rows: salesQuery.data?.rows || [],
    pagination: salesQuery.data?.pagination,
    summary: salesQuery.data?.summary,
  };
}
