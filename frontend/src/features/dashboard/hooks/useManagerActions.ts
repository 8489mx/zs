import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';

export function useManagerActions(limit = 8) {
  return useQuery({
    queryKey: queryKeys.managerActions(limit),
    queryFn: () => dashboardApi.managerActions(limit),
    staleTime: 60_000,
    refetchOnMount: false,
  });
}
