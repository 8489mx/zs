import { http } from '@/lib/http';

export interface TableServiceCall {
  id: number;
  tenant_id: string;
  branch_id?: number | null;
  table_number: string;
  call_type: 'waiter' | 'bill' | 'water' | 'clean';
  status: 'pending' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
}

export const tableCallsApi = {
  createCall: (data: { tableNumber: string; callType?: 'waiter' | 'bill' | 'water' | 'clean'; branchId?: number; notes?: string }, tenantId?: string) =>
    http<TableServiceCall>(`/api/sales/table-calls${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listPendingCalls: (branchId?: number) =>
    http<TableServiceCall[]>(`/api/sales/table-calls${branchId ? `?branchId=${branchId}` : ''}`),

  resolveCall: (id: number) =>
    http<TableServiceCall>(`/api/sales/table-calls/${id}/resolve`, {
      method: 'PATCH',
    }),

  resolveCallsForTable: (tableNumber: string) =>
    http<void>(`/api/sales/table-calls/table/${tableNumber}/resolve`, {
      method: 'PATCH',
    }),
};
