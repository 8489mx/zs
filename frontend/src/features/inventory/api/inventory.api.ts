import { http } from '@/lib/http';
import { unwrapArray, unwrapByKey, type PaginationMeta } from '@/lib/api/contracts';
import type { DamagedStockRecord, InventoryReport, Product, StockCountSession, StockMovementRecord, StockTransfer } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface StockMovementsPageQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: 'all' | string;
}

export interface InventoryPageQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | string;
}

interface StockMovementsPageResponse {
  stockMovements?: StockMovementRecord[];
  pagination?: PaginationMeta;
  summary?: {
    positive: number;
    negative: number;
    totalItems: number;
  };
}


interface StockTransfersPageResponse {
  stockTransfers?: StockTransfer[];
  pagination?: PaginationMeta;
  summary?: {
    totalItems: number;
    sent: number;
    received: number;
    cancelled: number;
    totalQty: number;
  };
}

interface StockCountSessionsPageResponse {
  stockCountSessions?: StockCountSession[];
  pagination?: PaginationMeta;
  summary?: {
    totalItems: number;
    draft: number;
    posted: number;
    totalVariance: number;
  };
}

interface DamagedStockPageResponse {
  damagedStockRecords?: DamagedStockRecord[];
  pagination?: PaginationMeta;
  summary?: {
    totalItems: number;
    totalQty: number;
  };
}


export const inventoryApi = {
  products: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  report: async () => unwrapByKey<InventoryReport>(await http<InventoryReport | { inventory: InventoryReport }>('/api/reports/inventory'), 'inventory', {} as InventoryReport),
  createAdjustment: (payload: unknown) => http('/api/inventory-adjustments', { method: 'POST', body: JSON.stringify(payload) }),
  createDamaged: (payload: unknown) => http('/api/damaged-stock', { method: 'POST', body: JSON.stringify(payload) }),
  stockTransfers: async () => unwrapArray<StockTransfer>(await http<StockTransfer[] | { stockTransfers: StockTransfer[] }>('/api/stock-transfers'), 'stockTransfers'),
  stockTransfersPage: async (params: InventoryPageQueryParams = {}) => {
    const response = await http<StockTransfersPageResponse>(`/api/stock-transfers${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.stockTransfers) ? response.stockTransfers : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 10,
        totalItems: Array.isArray(response.stockTransfers) ? response.stockTransfers.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.stockTransfers) && response.stockTransfers.length ? 1 : 0,
        rangeEnd: Array.isArray(response.stockTransfers) ? response.stockTransfers.length : 0,
      },
      summary: response.summary || { totalItems: 0, sent: 0, received: 0, cancelled: 0, totalQty: 0 },
    };
  },
  listAllTransfers: async (params: InventoryPageQueryParams = {}) => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const rows: StockTransfer[] = [];
    do {
      const response = await inventoryApi.stockTransfersPage({ ...params, page, pageSize });
      rows.push(...response.rows);
      totalPages = response.pagination.totalPages || 1;
      page += 1;
    } while (page <= totalPages);
    return rows;
  },
  stockMovements: async () => unwrapArray<StockMovementRecord>(await http<StockMovementRecord[] | { stockMovements: StockMovementRecord[] }>('/api/stock-movements'), 'stockMovements'),
  stockMovementsPage: async (params: StockMovementsPageQueryParams = {}) => {
    const response = await http<StockMovementsPageResponse>(`/api/stock-movements${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.stockMovements) ? response.stockMovements : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 20,
        totalItems: Array.isArray(response.stockMovements) ? response.stockMovements.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.stockMovements) && response.stockMovements.length ? 1 : 0,
        rangeEnd: Array.isArray(response.stockMovements) ? response.stockMovements.length : 0,
      },
      summary: response.summary || { positive: 0, negative: 0, totalItems: 0 },
    };
  },
  createStockTransfer: (payload: unknown) => http('/api/stock-transfers', { method: 'POST', body: JSON.stringify(payload) }),
  receiveStockTransfer: (transferId: string) => http(`/api/stock-transfers/${transferId}/receive`, { method: 'POST' }),
  cancelStockTransfer: (transferId: string) => http(`/api/stock-transfers/${transferId}/cancel`, { method: 'POST' }),
  stockCountSessions: async () => {
    const payload = await http<{ stockCountSessions?: StockCountSession[]; damagedStockRecords?: DamagedStockRecord[] }>('/api/stock-count-sessions');
    return {
      stockCountSessions: Array.isArray(payload?.stockCountSessions) ? payload.stockCountSessions : [],
      damagedStockRecords: Array.isArray(payload?.damagedStockRecords) ? payload.damagedStockRecords : []
    };
  },
  stockCountSessionsPage: async (params: InventoryPageQueryParams = {}) => {
    const response = await http<StockCountSessionsPageResponse>(`/api/stock-count-sessions${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.stockCountSessions) ? response.stockCountSessions : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 8,
        totalItems: Array.isArray(response.stockCountSessions) ? response.stockCountSessions.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.stockCountSessions) && response.stockCountSessions.length ? 1 : 0,
        rangeEnd: Array.isArray(response.stockCountSessions) ? response.stockCountSessions.length : 0,
      },
      summary: response.summary || { totalItems: 0, draft: 0, posted: 0, totalVariance: 0 },
    };
  },
  listAllStockCountSessions: async (params: InventoryPageQueryParams = {}) => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const rows: StockCountSession[] = [];
    do {
      const response = await inventoryApi.stockCountSessionsPage({ ...params, page, pageSize });
      rows.push(...response.rows);
      totalPages = response.pagination.totalPages || 1;
      page += 1;
    } while (page <= totalPages);
    return rows;
  },
  damagedStockPage: async (params: InventoryPageQueryParams = {}) => {
    const response = await http<DamagedStockPageResponse>(`/api/damaged-stock${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.damagedStockRecords) ? response.damagedStockRecords : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 10,
        totalItems: Array.isArray(response.damagedStockRecords) ? response.damagedStockRecords.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.damagedStockRecords) && response.damagedStockRecords.length ? 1 : 0,
        rangeEnd: Array.isArray(response.damagedStockRecords) ? response.damagedStockRecords.length : 0,
      },
      summary: response.summary || { totalItems: 0, totalQty: 0 },
    };
  },
  listAllDamagedStock: async (params: InventoryPageQueryParams = {}) => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const rows: DamagedStockRecord[] = [];
    do {
      const response = await inventoryApi.damagedStockPage({ ...params, page, pageSize });
      rows.push(...response.rows);
      totalPages = response.pagination.totalPages || 1;
      page += 1;
    } while (page <= totalPages);
    return rows;
  },
  createStockCountSession: (payload: unknown) => http('/api/stock-count-sessions', { method: 'POST', body: JSON.stringify(payload) }),
  postStockCountSession: (sessionId: string, payload: unknown) => http(`/api/stock-count-sessions/${sessionId}/post`, { method: 'POST', body: JSON.stringify(payload) })
};