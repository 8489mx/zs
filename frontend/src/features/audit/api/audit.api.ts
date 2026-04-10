import { http } from '@/lib/http';
import type { PaginationMeta } from '@/lib/api/contracts';
import type { AuditLog } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface AuditLogsSummary {
  distinctUsers: number;
  todayCount: number;
}

export interface AuditLogsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  mode?: 'all' | 'today' | 'withDetails';
}

interface AuditLogsResponse {
  auditLogs?: AuditLog[];
  pagination?: PaginationMeta;
  summary?: AuditLogsSummary;
}

function normalizeAuditFilter(mode?: AuditLogsQueryParams['mode']): string | undefined {
  if (!mode || mode === 'all') return undefined;
  if (mode === 'today') return 'today';
  if (mode === 'withDetails') return 'details';
  return undefined;
}

export const auditApi = {
  list: async (params: AuditLogsQueryParams = {}) => {
    const query = {
      ...(params.page ? { page: params.page } : {}),
      ...(params.pageSize ? { pageSize: params.pageSize } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(normalizeAuditFilter(params.mode) ? { filter: normalizeAuditFilter(params.mode) } : {}),
    };

    const response = await http<AuditLogsResponse>(`/api/audit-logs${buildQueryString(query)}`);
    return {
      rows: Array.isArray(response.auditLogs) ? response.auditLogs : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 50,
        totalItems: Array.isArray(response.auditLogs) ? response.auditLogs.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.auditLogs) && response.auditLogs.length ? 1 : 0,
        rangeEnd: Array.isArray(response.auditLogs) ? response.auditLogs.length : 0,
      },
      summary: response.summary || { distinctUsers: 0, todayCount: 0 },
    };
  },
  listAll: async (params: Omit<AuditLogsQueryParams, 'page' | 'pageSize'> = {}) => {
    const firstPage = await auditApi.list({ ...params, page: 1, pageSize: 200 });
    const allRows = [...firstPage.rows];
    const totalPages = firstPage.pagination?.totalPages || 1;
    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await auditApi.list({ ...params, page, pageSize: 200 });
      allRows.push(...nextPage.rows);
    }
    return { rows: allRows, summary: firstPage.summary, pagination: firstPage.pagination };
  },
};
