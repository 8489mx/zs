import { http } from '@/lib/http';

export interface SupplierPaymentScheduleLogItem {
  id: string;
  scheduleId: string;
  supplierId: string;
  amount: number;
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

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
  payments?: SupplierPaymentScheduleLogItem[];
}

export interface CreateSupplierBalanceSchedulePayload {
  mode: 'count' | 'amount';
  scheduleAmount?: number;
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

export const supplierBalanceScheduleApi = {
  list: async (supplierId: string) => unwrapSchedules(await http<SupplierPaymentScheduleResponse>(`/api/suppliers/${supplierId}/payment-schedule`)),
  create: async (supplierId: string, payload: CreateSupplierBalanceSchedulePayload) => unwrapSchedules(await http<SupplierPaymentScheduleResponse>(`/api/suppliers/${supplierId}/payment-schedule`, { method: 'POST', body: JSON.stringify(payload) })),
  settle: async (scheduleId: string, payload: SettleSupplierPaymentSchedulePayload) => unwrapSchedules(await http<SupplierPaymentScheduleResponse>(`/api/supplier-payment-schedules/${scheduleId}/settle`, { method: 'POST', body: JSON.stringify(payload) })),
};
