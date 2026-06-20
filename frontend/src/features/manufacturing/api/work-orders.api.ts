import { http } from '@/lib/http';

export interface CreateWorkOrderPayload {
  bomId: number;
  quantityToProduce: number;
  sourceLocationId?: number;
  destinationLocationId?: number;
  startDate?: string;
  endDate?: string;
  note?: string;
}

export interface CompleteWorkOrderPayload {
  sourceLocationId?: number;
  destinationLocationId?: number;
}

export interface WorkOrderRecord {
  id: string | number;
  doc_no?: string;
  bom_id: string | number;
  product_name: string;
  status: 'draft' | 'in_progress' | 'done' | 'cancelled';
  quantity_to_produce: number;
  produced_quantity: number;
  total_cost: number;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_by_id?: string;
  created_at?: string;
  createdAt?: string;
  note?: string;
  notes?: string;
}

export const workOrdersApi = {
  list: async (): Promise<WorkOrderRecord[]> => {
    const res = await http<{ workOrders: WorkOrderRecord[] }>('/api/manufacturing/work-orders');
    return res.workOrders || [];
  },
  
  create: async (data: CreateWorkOrderPayload): Promise<{ ok: boolean; workOrderId: number }> => {
    return http('/api/manufacturing/work-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  complete: async (id: string | number, data: CompleteWorkOrderPayload): Promise<{ ok: boolean }> => {
    return http(`/api/manufacturing/work-orders/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
};
