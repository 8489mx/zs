import { http } from '@/lib/http';

export interface DeliveryRep {
  id: number;
  name: string;
  phone: string | null;
  is_active: boolean;
}

export interface DeliveryOrder {
  id: number;
  docNo: string;
  total: number;
  customerName: string;
  orderType: string;
  deliveryRepId: number | null;
  deliveryRepName?: string;
  deliveryStatus: string | null;
  collectionStatus: string | null;
  settledAt: string | null;
  settledByName?: string;
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

  create: async (data: { name: string; phone?: string }): Promise<DeliveryRep> =>
    http<DeliveryRep>('/api/delivery-reps', { method: 'POST', body: JSON.stringify(data) }),

  update: async (id: number, data: { name: string; phone?: string; isActive?: boolean }): Promise<DeliveryRep> =>
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

  settleOrder: async (saleId: number): Promise<unknown> =>
    http(`/api/delivery-reps/settle/${saleId}`, { method: 'POST' }),

  settleAllOrders: async (repId: number, expectedAmount: number): Promise<unknown> =>
    http(`/api/delivery-reps/${repId}/settle-all`, { method: 'POST', body: JSON.stringify({ expectedAmount }) }),

  listSettlements: async (repId: number): Promise<any[]> =>
    unwrapArray<any>(await http<any[] | { settlements: any[] }>(`/api/delivery-reps/${repId}/settlements`), 'settlements'),

  getSummary: async (repId: number): Promise<DeliveryRepSummary> => {
    const res = await http<{ summary: DeliveryRepSummary }>(`/api/delivery-reps/${repId}/summary`);
    return res.summary;
  },
};
