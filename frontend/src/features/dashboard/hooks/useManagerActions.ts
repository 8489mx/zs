import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { useAuthStore, type AuthState } from '@/stores/auth-store';

export function useManagerActions(limit = 8) {
  const user = useAuthStore((s: AuthState) => s.user);
  const hasDashboardAccess = Boolean(
    user && (
      user.role === 'super_admin' ||
      user.role === 'admin' ||
      user.permissions?.includes('dashboard') ||
      user.permissions?.includes('all')
    )
  );

  return useQuery({
    queryKey: queryKeys.managerActions(limit),
    queryFn: () => dashboardApi.managerActions(limit),
    staleTime: 60_000,
    refetchOnMount: false,
    enabled: hasDashboardAccess,
  });
}
