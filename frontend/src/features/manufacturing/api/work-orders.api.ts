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

export interface WorkOrderOperationInput {
  workCenterId: number;
  operationName: string;
  durationHours: number;
  notes?: string;
  cost?: number;
}

export interface CompleteWorkOrderPayload {
  sourceLocationId?: number;
  destinationLocationId?: number;
  operations?: WorkOrderOperationInput[];
  byProducts?: Array<{
    productId: number;
    productName?: string;
    quantity: number;
    unitCost?: number;
    locationId?: number;
  }>;
}

export interface UnbuildOrderRecord {
  id: number;
  unbuild_number: string;
  product_id: number;
  product_name: string;
  bom_id: number;
  quantity: number;
  warehouse_id: number;
  status: string;
  total_cost: number;
  notes: string | null;
  created_at: string;
}

export interface CreateUnbuildOrderPayload {
  productId: number;
  bomId: number;
  quantity: number;
  warehouseId?: number;
  notes?: string;
}

export interface CreateMtoWorkOrderPayload {
  salesOrderId: number;
  productId: number;
  quantityToProduce: number;
  bomId?: number;
  notes?: string;
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
  },

  listUnbuild: async (): Promise<UnbuildOrderRecord[]> => {
    const res = await http<{ ok: boolean; unbuildOrders: UnbuildOrderRecord[] }>('/api/manufacturing/unbuild-orders');
    return res.unbuildOrders || [];
  },

  createUnbuild: async (data: CreateUnbuildOrderPayload): Promise<{ ok: boolean; unbuildNumber: string; message: string }> => {
    return http('/api/manufacturing/unbuild-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createMto: async (data: CreateMtoWorkOrderPayload): Promise<{ ok: boolean; workOrderId: number; message: string }> => {
    return http('/api/manufacturing/work-orders/mto', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
