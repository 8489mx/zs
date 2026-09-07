import { http } from '@/lib/http';

export interface WorkCenterRecord {
  id: number;
  tenant_id?: string;
  account_id?: string;
  code: string;
  name: string;
  cost_per_hour: number | string;
  capacity: number | string;
  time_efficiency: number | string;
  status: 'active' | 'maintenance' | 'inactive';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertWorkCenterPayload {
  code: string;
  name: string;
  costPerHour?: number;
  capacity?: number;
  timeEfficiency?: number;
  status?: 'active' | 'maintenance' | 'inactive';
  notes?: string;
}

export interface WorkOrderOperationRecord {
  id: number;
  work_order_id: number;
  work_center_id: number;
  work_center_name?: string;
  work_center_code?: string;
  operation_name: string;
  sequence: number;
  duration_hours: number | string;
  hourly_cost: number | string;
  total_cost: number | string;
  status: string;
  notes?: string | null;
  created_at?: string;
}

export const workCentersApi = {
  list: async (): Promise<WorkCenterRecord[]> => {
    const res = await http<{ ok: boolean; workCenters: WorkCenterRecord[] }>('/api/manufacturing/work-centers');
    return res.workCenters || [];
  },

  create: async (data: UpsertWorkCenterPayload): Promise<{ ok: boolean; workCenter: WorkCenterRecord }> => {
    return http('/api/manufacturing/work-centers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: UpsertWorkCenterPayload): Promise<{ ok: boolean; workCenter: WorkCenterRecord }> => {
    return http(`/api/manufacturing/work-centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<{ ok: boolean }> => {
    return http(`/api/manufacturing/work-centers/${id}`, {
      method: 'DELETE',
    });
  },

  getWorkOrderOperations: async (workOrderId: number): Promise<WorkOrderOperationRecord[]> => {
    const res = await http<{ ok: boolean; operations: WorkOrderOperationRecord[] }>(
      `/api/manufacturing/work-orders/${workOrderId}/operations`
    );
    return res.operations || [];
  },
};
