import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { productsApi, type ProductsListParams } from '@/features/products/api/products.api';

export function useProductsPageQuery(params: ProductsListParams) {
  const paramsKey = buildQueryParamsKey({
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    view: params.view && params.view !== 'all' ? params.view : undefined,
  });
  return useQuery({
    queryKey: queryKeys.productsPage(paramsKey),
    queryFn: () => productsApi.listPage(params),
    placeholderData: keepPreviousData,
  });
}
