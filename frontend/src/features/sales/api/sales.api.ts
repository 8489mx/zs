import { http } from '@/lib/http';
import { unwrapArray, unwrapEntity, type PaginationMeta } from '@/lib/api/contracts';
import type { Product, Sale } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

type SalesEnvelope = { sale: Sale };
type SalesMutationEnvelope = { ok?: boolean; sale: Sale };

export interface SalesListSummary {
  totalItems: number;
  totalSales: number;
  todaySalesCount: number;
  todaySalesTotal: number;
  cashTotal: number;
  creditTotal: number;
  cancelledCount: number;
  topCustomers: Array<{ name: string; total: number; count: number }>;
}

export interface SalesListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'cash' | 'credit' | 'cancelled';
}

interface SalesListResponse {
  sales?: Sale[];
  pagination?: PaginationMeta;
  summary?: SalesListSummary;
}


const defaultSummary: SalesListSummary = {
  totalItems: 0,
  totalSales: 0,
  todaySalesCount: 0,
  todaySalesTotal: 0,
  cashTotal: 0,
  creditTotal: 0,
  cancelledCount: 0,
  topCustomers: [],
};

export const salesApi = {
  list: async () => unwrapArray<Sale>(await http<Sale[] | { sales: Sale[] }>('/api/sales'), 'sales'),
  listPage: async (params: SalesListParams = {}) => {
    const response = await http<SalesListResponse>(`/api/sales${buildQueryString(params)}`);
    return {
      rows: Array.isArray(response.sales) ? response.sales : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 30,
        totalItems: Array.isArray(response.sales) ? response.sales.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.sales) && response.sales.length ? 1 : 0,
        rangeEnd: Array.isArray(response.sales) ? response.sales.length : 0,
      },
      summary: response.summary || defaultSummary,
    };
  },
  listAll: async (params: Omit<SalesListParams, 'page' | 'pageSize'> = {}) => {
    const firstPage = await salesApi.listPage({ ...params, page: 1, pageSize: 200 });
    const allRows = [...firstPage.rows];
    const totalPages = firstPage.pagination?.totalPages || 1;
    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await salesApi.listPage({ ...params, page, pageSize: 200 });
      allRows.push(...nextPage.rows);
    }
    return { rows: allRows, summary: firstPage.summary, pagination: firstPage.pagination };
  },
  products: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  getById: async (saleId: string) => unwrapEntity<Sale>(await http<Sale | SalesEnvelope>(`/api/sales/${saleId}`), 'sale'),
  create: async (payload: unknown) => unwrapEntity<Sale>(await http<Sale | SalesMutationEnvelope>('/api/sales', { method: 'POST', body: JSON.stringify(payload) }), 'sale'),
  cancel: async (saleId: string, reason: string, managerPin: string) => unwrapEntity<Sale>(await http<Sale | SalesMutationEnvelope>(`/api/sales/${saleId}/cancel`, { method: 'POST', body: JSON.stringify({ reason, managerPin }) }), 'sale'),
  update: async (saleId: string, payload: unknown) => unwrapEntity<Sale>(await http<Sale | SalesMutationEnvelope>(`/api/sales/${saleId}`, { method: 'PUT', body: JSON.stringify(payload) }), 'sale')
};