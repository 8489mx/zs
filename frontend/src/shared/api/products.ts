import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import { buildQueryString } from '@/lib/query-string';
import type { Category, Product, Supplier } from '@/types/domain';

export interface SharedProductsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  view?: 'all' | 'low' | 'out' | 'offers' | 'special';
}

export interface SharedProductsPageResponse {
  products: Product[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  summary: { totalProducts: number; lowStockCount: number; outOfStockCount: number; inventoryCost: number; inventorySaleValue: number; activeOffersCount: number; customerPriceCount: number };
}

export const sharedProductsApi = {
  list: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  listPage: (params: SharedProductsListParams) => http<SharedProductsPageResponse>(`/api/products${buildQueryString(params)}`),
  categories: async () => unwrapArray<Category>(await http<Category[] | { categories: Category[] }>('/api/categories'), 'categories'),
  suppliers: async () => unwrapArray<Supplier>(await http<Supplier[] | { suppliers: Supplier[] }>('/api/suppliers'), 'suppliers'),
  create: (payload: unknown) => http<unknown>('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
};
