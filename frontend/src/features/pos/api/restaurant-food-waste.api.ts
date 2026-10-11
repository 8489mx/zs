import { http } from '@/lib/http';

export interface FoodWasteLog {
  id: number;
  branch_id: number;
  branch_name?: string;
  product_id: number;
  product_name: string;
  quantity: number | string;
  cost_price: number | string;
  total_cost: number | string;
  reason: 'spoilage' | 'prep_error' | 'expired' | 'customer_complaint' | 'other';
  notes?: string;
  created_at: string;
}

export interface FoodWasteSummary {
  period: string;
  totalWasteCost: number;
  totalWasteIncidents: number;
  byReason: Array<{
    reason: string;
    cost: number;
    count: number;
  }>;
}

export const restaurantFoodWasteApi = {
  logWaste: async (payload: {
    branchId: number;
    productId: number;
    quantity: number;
    reason: string;
    notes?: string;
  }): Promise<any> => {
    return http.post('/sales/food-waste', payload);
  },

  listLogs: async (filters?: { branchId?: number; limit?: number }): Promise<FoodWasteLog[]> => {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', String(filters.branchId));
    if (filters?.limit) params.append('limit', String(filters.limit));
    return http.get(`/sales/food-waste?${params.toString()}`);
  },

  getSummary: async (branchId?: number): Promise<FoodWasteSummary> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', String(branchId));
    return http.get(`/sales/food-waste/summary?${params.toString()}`);
  },
};
