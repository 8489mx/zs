import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import { buildQueryString } from '@/lib/query-string';
import type { Category, Product, Supplier } from '@/types/domain';

export interface ProductsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  view?: 'all' | 'low' | 'out' | 'offers' | 'special';
}

export interface ProductsPageResponse {
  products: Product[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  summary: { totalProducts: number; lowStockCount: number; outOfStockCount: number; inventoryCost: number; inventorySaleValue: number; activeOffersCount: number; customerPriceCount: number };
}

export const productsApi = {
  list: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  listPage: (params: ProductsListParams) => http<ProductsPageResponse>(`/api/products${buildQueryString(params)}`),
  listAll: async (params: Omit<ProductsListParams, 'page' | 'pageSize'> = {}) => {
    const pageSize = 200;
    let page = 1;
    const rows: Product[] = [];
    let summary: ProductsPageResponse['summary'];
    while (true) {
      const payload = await productsApi.listPage({ ...params, page, pageSize });
      rows.push(...(payload.products || []));
      summary = payload.summary;
      const totalPages = payload.pagination?.totalPages || 1;
      if (page >= totalPages) break;
      page += 1;
    }
    return { products: rows, summary };
  },
  categories: async () => unwrapArray<Category>(await http<Category[] | { categories: Category[] }>('/api/categories'), 'categories'),
  suppliers: async () => unwrapArray<Supplier>(await http<Supplier[] | { suppliers: Supplier[] }>('/api/suppliers'), 'suppliers'),
  create: (payload: unknown) => http<unknown>('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: unknown) => http<unknown>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => http<{ ok: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),
  createCategory: (payload: { name: string }) => http<unknown>('/api/categories', { method: 'POST', body: JSON.stringify(payload) }),
  createSupplier: (payload: { name: string; phone?: string; address?: string; balance?: number; notes?: string }) =>
    http<unknown>('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) })
};
