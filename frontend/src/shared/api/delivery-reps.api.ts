import { http } from '@/lib/http';

export interface DeliveryRep {
  id: number;
  name: string;
  phone: string | null;
  full_name?: string | null;
  national_id?: string | null;
  address?: string | null;
  vehicle_plate?: string | null;
  pin_code?: string | null;
  is_active: boolean;
}

export interface UpsertDeliveryRepPayload {
  name: string;
  phone?: string;
  fullName?: string;
  nationalId?: string;
  address?: string;
  vehiclePlate?: string;
  pinCode?: string;
  isActive?: boolean;
}

export interface SettleOrderPayload {
  signatureDataUrl?: string;
  proofPhotoUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
}

export interface DeliveryOrder {
  id: number;
  docNo: string;
  total: number;
  deliveryFee?: number;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  orderType: string;
  deliveryRepId: number | null;
  deliveryRepName?: string;
  deliveryStatus: string | null;
  deliverySignature?: string | null;
  deliveryPhotoUrl?: string | null;
  deliveryGpsLat?: number | null;
  deliveryGpsLng?: number | null;
  deliveryNotes?: string | null;
  collectionStatus: string | null;
  settledAt: string | null;
  settledByName?: string;
  createdByName?: string;
  createdAt: string;
}

export interface DeliveryRepSummary {
  totalOrders: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
}

function unwrapArray<T>(raw: unknown, key: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && key in raw) return (raw as Record<string, unknown>)[key] as T[];
  return [];
}

export const deliveryRepsApi = {
  list: async (): Promise<DeliveryRep[]> =>
    unwrapArray<DeliveryRep>(await http<DeliveryRep[] | { deliveryReps: DeliveryRep[] }>('/api/delivery-reps'), 'deliveryReps'),

  create: async (data: UpsertDeliveryRepPayload): Promise<DeliveryRep> =>
    http<DeliveryRep>('/api/delivery-reps', { method: 'POST', body: JSON.stringify(data) }),

  update: async (id: number, data: UpsertDeliveryRepPayload): Promise<DeliveryRep> =>
    http<DeliveryRep>(`/api/delivery-reps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: async (id: number): Promise<unknown> =>
    http(`/api/delivery-reps/${id}`, { method: 'DELETE' }),

  listOrders: async (repId: number, params?: { dateFrom?: string; dateTo?: string; status?: string }): Promise<DeliveryOrder[]> => {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return unwrapArray<DeliveryOrder>(await http<DeliveryOrder[] | { orders: DeliveryOrder[] }>(`/api/delivery-reps/${repId}/orders${qs ? `?${qs}` : ''}`), 'orders');
  },

  settleOrder: async (saleId: number, payload?: SettleOrderPayload): Promise<unknown> =>
    http(`/api/delivery-reps/settle/${saleId}`, { method: 'POST', body: JSON.stringify(payload || {}) }),

  settleAllOrders: async (repId: number, expectedAmount: number): Promise<unknown> =>
    http(`/api/delivery-reps/${repId}/settle-all`, { method: 'POST', body: JSON.stringify({ expectedAmount }) }),

  listSettlements: async (repId: number, params?: { dateFrom?: string; dateTo?: string }): Promise<any[]> => {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    const qs = searchParams.toString();
    return unwrapArray<any>(await http<any[] | { settlements: any[] }>(`/api/delivery-reps/${repId}/settlements${qs ? `?${qs}` : ''}`), 'settlements');
  },

  getKPIs: async (repId: number): Promise<{ totalOrders: number; successfulOrders: number; returnedOrders: number; successRate: number; averageDelayHours: number; averageDelayMins?: number; rating: number }> => {
    const res = await http<{ kpis: any }>(`/api/delivery-reps/${repId}/kpi`);
    return res.kpis;
  },

  getSummary: async (repId: number): Promise<DeliveryRepSummary> => {
    const res = await http<{ summary: DeliveryRepSummary }>(`/api/delivery-reps/${repId}/summary`);
    return res.summary;
  },
};

export interface DriverPortalUser {
  id: number;
  name: string;
  fullName?: string | null;
  phone?: string | null;
  vehiclePlate?: string | null;
  tenantId: string;
}

export const driverPortalApi = {
  login: async (phone: string, pinCode: string): Promise<{ token: string; rep: DriverPortalUser }> => {
    const res = await http<{ token: string; rep: DriverPortalUser }>('/api/driver-portal/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pinCode }),
    });
    if (res?.token) {
      localStorage.setItem('zs_driver_portal_token', res.token);
      localStorage.setItem('zs_driver_portal_rep', JSON.stringify(res.rep));
    }
    return res;
  },

  getStoredSession: (): { token: string; rep: DriverPortalUser } | null => {
    try {
      const token = localStorage.getItem('zs_driver_portal_token');
      const rep = localStorage.getItem('zs_driver_portal_rep');
      if (token && rep) return { token, rep: JSON.parse(rep) };
      return null;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('zs_driver_portal_token');
    localStorage.removeItem('zs_driver_portal_rep');
  },

  getOrders: async (status?: string): Promise<DeliveryOrder[]> => {
    const token = localStorage.getItem('zs_driver_portal_token');
    const query = status ? `?status=${status}` : '';
    const res = await http<{ ok: boolean; orders: DeliveryOrder[] }>(`/api/driver-portal/orders${query}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    return res.orders || [];
  },

  settleOrder: async (saleId: number, payload?: SettleOrderPayload): Promise<{ ok: boolean }> => {
    const token = localStorage.getItem('zs_driver_portal_token');
    return http<{ ok: boolean }>(`/api/driver-portal/orders/${saleId}/settle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(payload || {}),
    });
  },
};

