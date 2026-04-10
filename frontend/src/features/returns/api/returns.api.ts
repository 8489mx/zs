import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import type { ReturnRecord } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface ReturnsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'sales' | 'purchase' | 'today';
}

export interface ReturnsListResponse {
  returns: ReturnRecord[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary?: {
    totalItems: number;
    totalAmount: number;
    salesReturns: number;
    purchaseReturns: number;
    todayCount: number;
    latestDocNo?: string;
  };
}


export const returnsApi = {
  list: async () => unwrapArray<ReturnRecord>(await http<ReturnRecord[] | { returns: ReturnRecord[] }>('/api/returns'), 'returns'),
  listPage: (params: ReturnsListParams) => http<ReturnsListResponse>(`/api/returns${buildQueryString(params)}`),
  listAll: async (params: Omit<ReturnsListParams, 'page' | 'pageSize'> = {}) => {
    const pageSize = 200;
    let page = 1;
    const rows: ReturnRecord[] = [];
    let summary: ReturnsListResponse['summary'];
    while (true) {
      const payload = await returnsApi.listPage({ ...params, page, pageSize });
      rows.push(...(payload.returns || []));
      summary = payload.summary;
      const totalPages = payload.pagination?.totalPages || 1;
      if (page >= totalPages) break;
      page += 1;
    }
    return { returns: rows, summary };
  },
  create: (payload: unknown) => http('/api/returns', { method: 'POST', body: JSON.stringify(payload) })
};