import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';

export function useDashboardManagerOverview(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardManagerOverview,
    queryFn: () => dashboardApi.managerOverview(),
    staleTime: 30_000,
    refetchOnMount: true,
    enabled,
  });
}
