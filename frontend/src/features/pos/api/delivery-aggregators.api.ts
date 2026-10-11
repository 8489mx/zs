import { http } from '@/lib/http';

export interface DeliveryAggregator {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  commission_rate: number | string;
  is_active: boolean;
  auto_accept_orders: boolean;
}

export interface AggregatorOrder {
  id: number;
  aggregator_id: number;
  aggregator_code: string;
  aggregator_name: string;
  external_order_id: string;
  display_number: string;
  status: 'received' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  rider_name?: string;
  rider_phone?: string;
  subtotal: number | string;
  delivery_fee: number | string;
  aggregator_commission: number | string;
  net_payout: number | string;
  order_payload?: any;
  created_at: string;
}

export const deliveryAggregatorsApi = {
  listAggregators: async (): Promise<DeliveryAggregator[]> => {
    return http.get('/sales/aggregators');
  },

  updateAggregator: async (id: number, payload: Partial<DeliveryAggregator>): Promise<{ success: boolean }> => {
    return http.patch(`/sales/aggregators/${id}`, payload);
  },

  listOrders: async (filters?: { status?: string; limit?: number }): Promise<AggregatorOrder[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.limit) params.append('limit', String(filters.limit));
    return http.get(`/sales/aggregators/orders?${params.toString()}`);
  },

  updateOrderStatus: async (id: number, status: string): Promise<{ success: boolean; status: string }> => {
    return http.patch(`/sales/aggregators/orders/${id}/status`, { status });
  },

  trigger86: async (productId: number, isAvailable: boolean): Promise<any> => {
    return http.post('/sales/aggregators/86', { productId, isAvailable });
  },
};
