import { http } from '@/lib/http';

export interface SupplierPaymentScheduleItem {
  id: string;
  purchaseId: string;
  supplierId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | string;
  note: string;
  paidAt?: string | null;
}

export interface CreateSupplierPaymentSchedulePayload {
  mode: 'count' | 'amount';
  installmentCount?: number;
  installmentAmount?: number;
  firstDueDate: string;
  intervalDays: number;
  roundingStep?: number;
  note?: string;
}

export interface SettleSupplierPaymentSchedulePayload {
  amount?: number;
  note?: string;
  branchId?: number;
  locationId?: number;
}

interface SupplierPaymentScheduleResponse {
  schedules?: SupplierPaymentScheduleItem[];
}

function unwrapSchedules(response: SupplierPaymentScheduleResponse): SupplierPaymentScheduleItem[] {
  return Array.isArray(response.schedules) ? response.schedules : [];
}

export const purchasePaymentScheduleApi = {
  list: async (purchaseId: string) => unwrapSchedules(await http<SupplierPaymentScheduleResponse>(`/api/purchases/${purchaseId}/payment-schedule`)),
  create: async (purchaseId: string, payload: CreateSupplierPaymentSchedulePayload) => unwrapSchedules(await http<SupplierPaymentScheduleResponse>(`/api/purchases/${purchaseId}/payment-schedule`, { method: 'POST', body: JSON.stringify(payload) })),
  settle: async (scheduleId: string, payload: SettleSupplierPaymentSchedulePayload) => unwrapSchedules(await http<SupplierPaymentScheduleResponse>(`/api/supplier-payment-schedules/${scheduleId}/settle`, { method: 'POST', body: JSON.stringify(payload) })),
};
