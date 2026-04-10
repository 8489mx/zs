import { http } from '@/lib/http';
import { unwrapArray, unwrapByKey } from '@/lib/api/contracts';
import type { Customer, InventoryReport, Product, ReportSummary } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface ReportInventoryLocationBreakdown {
  locationId: string;
  locationName: string;
  branchId?: string;
  branchName?: string;
  qty: number;
}

export interface ReportInventoryLocationHighlight {
  locationId: string;
  locationName: string;
  branchId?: string;
  branchName?: string;
  totalQty: number;
  trackedProducts: number;
  attentionItems: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export interface ReportInventoryRow {
  id: string;
  name: string;
  category?: string;
  supplier?: string;
  stock: number;
  stockQty?: number;
  minStock: number;
  status?: string;
  topLocationName?: string;
  topLocationQty?: number;
  locationsLabel?: string;
  assignedQty?: number;
  unassignedQty?: number;
  locations?: ReportInventoryLocationBreakdown[];
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
  items?: Array<ReportInventoryRow & {
    stockQty?: number;
    stock?: number;
    topLocationName?: string;
    topLocationQty?: number;
    locationsLabel?: string;
    assignedQty?: number;
    unassignedQty?: number;
    locations?: ReportInventoryLocationBreakdown[];
  }>;
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
    trackedLocations?: number;
  };
  locationHighlights?: ReportInventoryLocationHighlight[];
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
    const rows = Array.isArray(response.items)
      ? response.items.map((item) => ({
          ...item,
          stock: Number(item.stock ?? item.stockQty ?? 0),
          stockQty: Number(item.stockQty ?? item.stock ?? 0),
          minStock: Number(item.minStock ?? 0),
          topLocationQty: Number(item.topLocationQty ?? 0),
          assignedQty: Number(item.assignedQty ?? 0),
          unassignedQty: Number(item.unassignedQty ?? 0),
          locationsLabel: item.locationsLabel || '',
          locations: Array.isArray(item.locations) ? item.locations : [],
        }))
      : [];
    return {
      rows,
      pagination: response.pagination || {
        page: 1,
        pageSize: rows.length || Number(params.pageSize || 10),
        totalItems: rows.length,
        totalPages: 1,
        rangeStart: rows.length ? 1 : 0,
        rangeEnd: rows.length,
      },
      summary: {
        totalItems: Number(response.summary?.totalItems ?? rows.length),
        outOfStock: Number(response.summary?.outOfStock ?? 0),
        lowStock: Number(response.summary?.lowStock ?? 0),
        healthy: Number(response.summary?.healthy ?? 0),
        trackedLocations: Number(response.summary?.trackedLocations ?? 0),
        locationHighlights: Array.isArray(response.locationHighlights) ? response.locationHighlights : [],
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