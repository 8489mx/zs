import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { buildQueryParamsKey } from '@/lib/query-string';
import { reportsApi, type ReportInventoryQueryParams } from '@/features/reports/api/reports.api';

export function useReportInventoryPage(params: ReportInventoryQueryParams) {
  return useQuery({
    queryKey: queryKeys.reportInventoryPage(buildQueryParamsKey(params, 'report-inventory')),
    queryFn: () => reportsApi.inventoryPage(params),
    placeholderData: keepPreviousData,
  });
}
