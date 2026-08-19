import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { reportsApi } from '@/features/reports/api/reports.api';

export function useReportsOverview(from: string, to: string, options?: { enabled?: boolean }) {
  const reportQuery = useQuery({
    queryKey: queryKeys.reportsSummary(from, to),
    queryFn: () => reportsApi.summary(from, to),
    enabled: Boolean(from && to) && (options?.enabled ?? true)
  });
  return { reportQuery };
}
