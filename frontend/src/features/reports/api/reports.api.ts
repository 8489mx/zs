import { http } from '@/lib/http';
import { unwrapArray, unwrapByKey } from '@/lib/api/contracts';
import type { Customer, InventoryReport, Product, ReportSummary } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface ReportInventoryRow {
  id: string;
  name: string;
  category?: string;
  supplier?: string;
  stock: number;
  minStock: number;
  status?: string;
}

export interface ReportInventoryQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'attention' | 'low' | 'out';
}

export interface CustomerBalancesQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'high-balance' | 'over-limit';
}

interface ReportInventoryPageResponse {
  items?: ReportInventoryRow[];
  inventory?: InventoryReport;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    rangeStart: number;
    rangeEnd: number;
  };
  summary?: {
    totalItems: number;
    outOfStock: number;
    lowStock: number;
    healthy: number;
  };
}

interface CustomerBalancesPageResponse {
  customers?: Customer[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    rangeStart: number;
    rangeEnd: number;
  };
  summary?: {
    totalItems: number;
    totalBalance: number;
    overLimit: number;
    highBalance: number;
  };
}

type PagedResult<T> = { rows: T[]; pagination?: { page: number; totalPages: number } };



async function listAllPages<T>(fetchPage: (page: number) => Promise<PagedResult<T>>) {
  const first = await fetchPage(1);
  const rows = [...first.rows];
  const totalPages = Math.max(1, Number(first.pagination?.totalPages || 1));
  for (let page = 2; page <= totalPages; page += 1) {
    const current = await fetchPage(page);
    rows.push(...current.rows);
  }
  return rows;
}

export const reportsApi = {
  summary: (from: string, to: string) => http<ReportSummary>(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  inventory: async () => unwrapByKey<InventoryReport>(await http<InventoryReport | { inventory: InventoryReport }>('/api/reports/inventory'), 'inventory', {} as InventoryReport),
  inventoryPage: async (params: ReportInventoryQueryParams) => {
    const response = await http<ReportInventoryPageResponse>(`/api/reports/inventory${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.items) ? response.items : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: Array.isArray(response.items) ? response.items.length || Number(params.pageSize || 10) : Number(params.pageSize || 10),
        totalItems: Array.isArray(response.items) ? response.items.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.items) && response.items.length ? 1 : 0,
        rangeEnd: Array.isArray(response.items) ? response.items.length : 0,
      },
      summary: response.summary || {
        totalItems: Array.isArray(response.items) ? response.items.length : 0,
        outOfStock: 0,
        lowStock: 0,
        healthy: 0,
      },
    };
  },
  listAllInventory: async (params: Omit<ReportInventoryQueryParams, 'page' | 'pageSize'>) => listAllPages<ReportInventoryRow>((page) => reportsApi.inventoryPage({ ...params, page, pageSize: 100 })),
  customerBalances: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/reports/customer-balances'), 'customers'),
  customerBalancesPage: async (params: CustomerBalancesQueryParams) => {
    const response = await http<CustomerBalancesPageResponse>(`/api/reports/customer-balances${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.customers) ? response.customers : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: Array.isArray(response.customers) ? response.customers.length || Number(params.pageSize || 10) : Number(params.pageSize || 10),
        totalItems: Array.isArray(response.customers) ? response.customers.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.customers) && response.customers.length ? 1 : 0,
        rangeEnd: Array.isArray(response.customers) ? response.customers.length : 0,
      },
      summary: response.summary || {
        totalItems: Array.isArray(response.customers) ? response.customers.length : 0,
        totalBalance: Array.isArray(response.customers) ? response.customers.reduce((sum, row) => sum + Number(row.balance || 0), 0) : 0,
        overLimit: 0,
        highBalance: 0,
      },
    };
  },
  listAllCustomerBalances: async (params: Omit<CustomerBalancesQueryParams, 'page' | 'pageSize'>) => listAllPages<Customer>((page) => reportsApi.customerBalancesPage({ ...params, page, pageSize: 100 })),
  products: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products')
};