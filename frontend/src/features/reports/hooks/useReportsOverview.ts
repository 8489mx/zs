import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { reportsApi } from '@/features/reports/api/reports.api';

export function useReportsOverview(
  from: string,
  to: string,
  options?: {
    enabled?: boolean;
    locationId?: string;
    userId?: string;
    branchId?: string;
  }
) {
  const locationId = options?.locationId && options.locationId !== 'all' ? options.locationId : undefined;
  const userId = options?.userId && options.userId !== 'all' ? options.userId : undefined;
  const branchId = options?.branchId && options.branchId !== 'all' ? options.branchId : undefined;
  const paramsKey = [locationId || '', userId || '', branchId || ''].join(':');

  const reportQuery = useQuery({
    queryKey: [...queryKeys.reportsSummary(from, to), paramsKey],
    queryFn: () => reportsApi.summary(from, to, { locationId, userId, branchId }),
    enabled: Boolean(from && to) && (options?.enabled ?? true)
  });
  return { reportQuery };
}
