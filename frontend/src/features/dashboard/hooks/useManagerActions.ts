import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { useAuthStore, type AuthState } from '@/stores/auth-store';

export function useManagerActions(limit = 8) {
  const user = useAuthStore((s: AuthState) => s.user);
  const isAuthenticated = Boolean(user);

  return useQuery({
    queryKey: queryKeys.managerActions(limit),
    queryFn: () => dashboardApi.managerActions(limit),
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchOnMount: true,
    enabled: isAuthenticated,
  });
}
