import { http } from '@/lib/http';

export interface DemoActivitySummary {
  key: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  categoryCount?: number;
  categoriesCount?: number;
  productCount?: number;
  productsCount?: number;
  sampleCategories?: string[];
  sampleProducts?: string[];
  sampleItems?: string[];
}

export interface DemoDataStatusResponse {
  isEmpty: boolean;
  productCount: number;
  saleCount: number;
  isSuperAdmin: boolean;
}

export interface SeedDemoDataPayload {
  activityType: string;
  password?: string;
  wipeExisting?: boolean;
  seedSales?: boolean;
  seedOnlineOrders?: boolean;
}

export interface SeedDemoDataResult {
  ok: boolean;
  message: string;
  activity?: string;
  productsCount?: number;
  salesCount?: number;
  onlineOrdersCount?: number;
}

export interface ClearDemoDataResult {
  ok: boolean;
  message: string;
  deletedProductsCount?: number;
}

export const demoDataApi = {
  getStatus: () =>
    http<DemoDataStatusResponse>('/api/admin/demo-data/status'),

  getActivities: () =>
    http<DemoActivitySummary[]>('/api/admin/demo-data/activities'),

  seedDemoData: (payload: SeedDemoDataPayload) =>
    http<SeedDemoDataResult>('/api/admin/demo-data/seed', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  clearDemoData: (password?: string) =>
    http<ClearDemoDataResult>('/api/admin/demo-data/clear', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  wipeAllData: (password: string) =>
    http<{ ok: boolean; message: string }>('/api/admin/demo-data/wipe', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};
