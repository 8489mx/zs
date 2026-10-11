import { http } from '@/lib/http';

export interface KitchenPrinter {
  id: number;
  name: string;
  station_code: 'kitchen' | 'bar' | 'grill' | 'fryer' | 'cold' | 'dessert' | 'expo' | string;
  ip_address?: string;
  port: number;
  paper_width: '80mm' | '58mm' | string;
  is_active: boolean;
  branch_id?: number;
  categoryIds: number[];
  created_at: string;
}

export const kitchenPrintersApi = {
  listPrinters: async (branchId?: number): Promise<KitchenPrinter[]> => {
    const qs = branchId ? `?branchId=${branchId}` : '';
    const endpoint = '/api/sales/kitchen-printers';
    return http<KitchenPrinter[]>(qs ? `${endpoint}${qs}` : endpoint);
  },

  createPrinter: async (payload: {
    name: string;
    stationCode: string;
    ipAddress?: string;
    port?: number;
    paperWidth?: string;
    branchId?: number;
    isActive?: boolean;
    categoryIds?: number[];
  }): Promise<KitchenPrinter> => {
    return http<KitchenPrinter>('/api/sales/kitchen-printers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updatePrinter: async (id: number, payload: Partial<{
    name: string;
    stationCode: string;
    ipAddress?: string;
    port?: number;
    paperWidth?: string;
    branchId?: number;
    isActive?: boolean;
    categoryIds?: number[];
  }>): Promise<KitchenPrinter> => {
    return http<KitchenPrinter>(`/api/sales/kitchen-printers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deletePrinter: async (id: number): Promise<{ success: boolean }> => {
    return http<{ success: boolean }>(`/api/sales/kitchen-printers/${id}`, {
      method: 'DELETE',
    });
  },
};
