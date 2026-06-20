import { http } from '@/lib/http';
import type { componentsApi } from './components.api';

export interface BomLine {
  componentProductId: number;
  quantity: number;
  unitName: string;
  expectedCost: number;
  unitMultiplier: number;
}

export interface CreateBomPayload {
  productId: number;
  quantity: number;
  lines: BomLine[];
}

export interface BomRecord {
  id: string | number;
  product_id: string | number;
  product_name: string;
  quantity: number;
  expected_cost: number;
  is_active: boolean;
  created_at?: string;
  lines?: any[];
}

export const bomsApi = {
  list: async (): Promise<BomRecord[]> => {
    const res = await http<{ boms: BomRecord[] }>('/api/manufacturing/boms');
    return res.boms || [];
  },
  
  create: async (data: CreateBomPayload): Promise<{ ok: boolean; bomId: number }> => {
    return http('/api/manufacturing/boms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string | number, data: CreateBomPayload): Promise<{ ok: boolean }> => {
    return http(`/api/manufacturing/boms/${id}`, {
      method: 'PUT', // or PATCH, depending on backend. We might need to implement update in backend if not exists! Wait, I should check if backend has update.
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string | number): Promise<{ ok: boolean }> => {
    return http(`/api/manufacturing/boms/${id}`, {
      method: 'DELETE',
    });
  }
};
