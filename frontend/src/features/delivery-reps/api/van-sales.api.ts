import { http } from '@/lib/http';

export interface VanStockItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  costPrice: number;
  retailPrice: number;
  unitName?: string;
}

export interface VanTripSummary {
  id: number;
  repId: number;
  repName: string;
  vanLocationId: number;
  vanLocationName: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  status: 'open' | 'settled';
  openedAt: string;
  closedAt?: string;
  loadedAmount: number;
  salesAmount: number;
  cashCollected: number;
  creditSales: number;
  returnsAmount: number;
  variance: number;
  notes?: string;
}

export interface VanActiveTripResponse {
  hasActiveTrip: boolean;
  trip?: VanTripSummary;
  vanLocation?: { id: number; name: string };
  inventory: VanStockItem[];
  customers: { id: number; name: string; phone?: string; address?: string; balance: number }[];
  recentSales: {
    id: number;
    docNo: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    customerName?: string;
  }[];
}

function getDriverAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('zs_driver_portal_token') : null;
  return { Authorization: `Bearer ${token || ''}` };
}

export const vanSalesApi = {
  getActiveTrip: async (): Promise<VanActiveTripResponse> => {
    return http<VanActiveTripResponse>('/api/driver-portal/van-sales/active-trip', {
      headers: getDriverAuthHeaders(),
    });
  },

  openTrip: async (payload: {
    sourceWarehouseId: number;
    items: { productId: number; qty: number }[];
    notes?: string;
  }): Promise<{ ok: boolean; tripId: number; totalLoadedValue: number; itemsCount: number }> => {
    return http('/api/driver-portal/van-sales/trips/open', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  executeSale: async (payload: {
    tripId: number;
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    paymentMethod: 'cash' | 'credit';
    items: { productId: number; qty: number; unitPrice?: number }[];
    notes?: string;
  }): Promise<{
    ok: boolean;
    saleId: number;
    docNo: string;
    total: number;
    paymentMethod: 'cash' | 'credit';
    customerName: string;
    itemsCount: number;
  }> => {
    return http('/api/driver-portal/van-sales/sales', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  recordCollection: async (payload: {
    tripId: number;
    customerId: number;
    amount: number;
    notes?: string;
  }): Promise<{
    ok: boolean;
    receiptNo: string;
    amount: number;
    customerName: string;
    newBalance: number;
  }> => {
    return http('/api/driver-portal/van-sales/collections', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  recordReturn: async (payload: {
    tripId: number;
    customerId: number;
    items: { productId: number; qty: number; unitPrice: number }[];
    notes?: string;
  }): Promise<{
    ok: boolean;
    returnDocNo: string;
    totalReturned: number;
  }> => {
    return http('/api/driver-portal/van-sales/returns', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  settleTrip: async (payload: {
    tripId: number;
    countedCash: number;
    unloadRemainingToWarehouse: boolean;
    notes?: string;
  }): Promise<{
    ok: boolean;
    tripId: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
    unloadedItemsCount: number;
    status: 'settled';
  }> => {
    return http('/api/driver-portal/van-sales/trips/settle', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  listAdminTrips: async (filters?: {
    repId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<VanTripSummary[]> => {
    const searchParams = new URLSearchParams();
    if (filters?.repId) searchParams.set('repId', String(filters.repId));
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) searchParams.set('dateTo', filters.dateTo);
    const qs = searchParams.toString();
    const res = await http<{ ok: boolean; trips: VanTripSummary[] }>(`/api/van-sales/admin/trips${qs ? `?${qs}` : ''}`);
    return res.trips || [];
  },
};
