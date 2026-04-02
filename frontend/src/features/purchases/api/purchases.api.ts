import { http } from '@/lib/http';
import { unwrapArray, unwrapEntity, type PaginationMeta } from '@/lib/api/contracts';
import type { Product, Purchase, Supplier } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

type PurchaseEnvelope = { purchase: Purchase };
type PurchaseMutationEnvelope = { ok?: boolean; purchase: Purchase };

export interface PurchasesListSummary {
  totalItems: number;
  totalAmount: number;
  creditTotal: number;
  cancelledCount: number;
  posted: number;
  draft: number;
  topSuppliers: Array<{ name: string; total: number; count: number }>;
}

export interface PurchasesListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'cash' | 'credit' | 'cancelled';
}

interface PurchasesListResponse {
  purchases?: Purchase[];
  pagination?: PaginationMeta;
  summary?: PurchasesListSummary;
}


const defaultSummary: PurchasesListSummary = {
  totalItems: 0,
  totalAmount: 0,
  creditTotal: 0,
  cancelledCount: 0,
  posted: 0,
  draft: 0,
  topSuppliers: [],
};

export const purchasesApi = {
  list: async () => unwrapArray<Purchase>(await http<Purchase[] | { purchases: Purchase[] }>('/api/purchases'), 'purchases'),
  listPage: async (params: PurchasesListParams = {}) => {
    const response = await http<PurchasesListResponse>(`/api/purchases${buildQueryString(params)}`);
    return {
      rows: Array.isArray(response.purchases) ? response.purchases : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 25,
        totalItems: Array.isArray(response.purchases) ? response.purchases.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.purchases) && response.purchases.length ? 1 : 0,
        rangeEnd: Array.isArray(response.purchases) ? response.purchases.length : 0,
      },
      summary: response.summary || defaultSummary,
    };
  },
  listAll: async (params: Omit<PurchasesListParams, 'page' | 'pageSize'> = {}) => {
    const firstPage = await purchasesApi.listPage({ ...params, page: 1, pageSize: 200 });
    const allRows = [...firstPage.rows];
    const totalPages = firstPage.pagination?.totalPages || 1;
    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await purchasesApi.listPage({ ...params, page, pageSize: 200 });
      allRows.push(...nextPage.rows);
    }
    return { rows: allRows, summary: firstPage.summary, pagination: firstPage.pagination };
  },
  products: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  suppliers: async () => unwrapArray<Supplier>(await http<Supplier[] | { suppliers: Supplier[] }>('/api/suppliers'), 'suppliers'),
  getById: async (purchaseId: string) => unwrapEntity<Purchase>(await http<Purchase | PurchaseEnvelope>(`/api/purchases/${purchaseId}`), 'purchase'),
  create: async (payload: unknown) => unwrapEntity<Purchase>(await http<Purchase | PurchaseMutationEnvelope>('/api/purchases', { method: 'POST', body: JSON.stringify(payload) }), 'purchase'),
  cancel: async (purchaseId: string, reason: string, managerPin: string) => unwrapEntity<Purchase>(await http<Purchase | PurchaseMutationEnvelope>(`/api/purchases/${purchaseId}/cancel`, { method: 'POST', body: JSON.stringify({ reason, managerPin }) }), 'purchase'),
  update: async (purchaseId: string, payload: unknown) => unwrapEntity<Purchase>(await http<Purchase | PurchaseMutationEnvelope>(`/api/purchases/${purchaseId}`, { method: 'PUT', body: JSON.stringify(payload) }), 'purchase')
};