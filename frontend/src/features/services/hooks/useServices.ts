import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { servicesApi } from '@/features/services/api/services.api';

export function useServices() {
  return useQuery({ queryKey: queryKeys.services, queryFn: servicesApi.list });
}
