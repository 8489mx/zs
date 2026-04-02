import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import type { ServiceRecord } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface ServicesListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'today' | 'high' | 'notes';
}

export interface ServicesListResponse {
  services: ServiceRecord[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary?: {
    totalItems: number;
    totalAmount: number;
    todayCount: number;
    averageAmount: number;
    highestAmount: number;
    latestServiceName?: string;
    latestCreatedByName?: string;
  };
}


export const servicesApi = {
  list: async () => unwrapArray<ServiceRecord>(await http<ServiceRecord[] | { services: ServiceRecord[] }>('/api/services'), 'services'),
  listPage: (params: ServicesListParams) => http<ServicesListResponse>(`/api/services${buildQueryString(params)}`),
  listAll: async (params: Omit<ServicesListParams, 'page' | 'pageSize'> = {}) => {
    const pageSize = 200;
    let page = 1;
    const rows: ServiceRecord[] = [];
    let summary: ServicesListResponse['summary'];
    while (true) {
      const payload = await servicesApi.listPage({ ...params, page, pageSize });
      rows.push(...(payload.services || []));
      summary = payload.summary;
      const totalPages = payload.pagination?.totalPages || 1;
      if (page >= totalPages) break;
      page += 1;
    }
    return { services: rows, summary };
  },
  create: (payload: unknown) => http<ServiceRecord>('/api/services', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: unknown) => http<ServiceRecord>(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => http<{ ok: boolean }>(`/api/services/${id}`, { method: 'DELETE' })
};