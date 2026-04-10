import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { dayRangeLast30 } from '@/lib/format';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';

export function useDashboardOverview() {
  const range = useMemo(() => {
    const reference = new Date();
    reference.setHours(23, 59, 59, 999);
    return dayRangeLast30(reference);
  }, []);

  return useQuery({
    queryKey: queryKeys.dashboardOverview(range.from, range.to),
    queryFn: () => dashboardApi.overview(range.from, range.to),
    staleTime: 60_000,
    refetchOnMount: false,
    placeholderData: keepPreviousData
  });
}
