import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';
import type {
  TamperAuditListResponse,
  TamperAuditQueryParams,
  TamperChainVerificationResult,
  TamperAuditLogItem,
} from '../types/tamper-audit.types';

export const tamperAuditApi = {
  list: async (params: TamperAuditQueryParams = {}): Promise<TamperAuditListResponse> => {
    const qs = buildQueryString({
      ...(params.page ? { page: params.page } : {}),
      ...(params.pageSize ? { pageSize: params.pageSize } : {}),
      ...(params.tableName ? { tableName: params.tableName } : {}),
      ...(params.operation ? { operation: params.operation } : {}),
      ...(params.recordId ? { recordId: params.recordId } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(params.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params.toDate ? { toDate: params.toDate } : {}),
    });
    return http<TamperAuditListResponse>(`/api/audit/tamper-trail${qs}`);
  },

  verifyChain: async (): Promise<TamperChainVerificationResult> => {
    return http<TamperChainVerificationResult>('/api/audit/tamper-trail/verify');
  },

  getRecordHistory: async (tableName: string, recordId: string) => {
    return http<{ tableName: string; recordId: string; totalModifications: number; history: TamperAuditLogItem[] }>(
      `/api/audit/tamper-trail/history/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`
    );
  },
};
