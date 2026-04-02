import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { servicesApi, type ServicesListParams } from '@/features/services/api/services.api';

export function useServicesPage(params: ServicesListParams) {
  const paramsKey = buildQueryParamsKey(params, 'default');
  return useQuery({
    queryKey: queryKeys.servicesPage(paramsKey),
    queryFn: () => servicesApi.listPage(params),
    placeholderData: keepPreviousData
  });
}
