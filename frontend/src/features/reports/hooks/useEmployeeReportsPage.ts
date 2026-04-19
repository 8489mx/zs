import { useQuery } from '@tanstack/react-query';
import { reportsApi, type EmployeeReportsQueryParams } from '@/features/reports/api/reports.api';

function makeParamsKey(params: EmployeeReportsQueryParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    search: params.search || '',
    userId: params.userId || '',
    role: params.role || 'all',
    activityType: params.activityType || 'all',
    from: params.from || '',
    to: params.to || '',
  });
}

export function useEmployeeReportsPage(params: EmployeeReportsQueryParams) {
  return useQuery({
    queryKey: ['reports', 'employees', makeParamsKey(params)],
    queryFn: () => reportsApi.employeeReportsPage(params),
    placeholderData: (previous) => previous,
  });
}
