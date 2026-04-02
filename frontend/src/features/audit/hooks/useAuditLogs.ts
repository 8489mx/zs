import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { auditApi, type AuditLogsQueryParams } from '@/features/audit/api/audit.api';

function makeParamsKey(params: AuditLogsQueryParams) {
  return JSON.stringify({
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search || '',
    mode: params.mode || 'all',
  });
}

export function useAuditLogs(params: AuditLogsQueryParams) {
  return useQuery({
    queryKey: queryKeys.auditLogsPage(makeParamsKey(params)),
    queryFn: () => auditApi.list(params),
    placeholderData: (previous) => previous,
  });
}
