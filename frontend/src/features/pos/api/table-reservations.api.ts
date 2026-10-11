import { apiClient } from '@/shared/api/client';

export interface TableReservation {
  id: number;
  tenant_id: string;
  branch_id: number | null;
  table_number: string;
  guest_name: string;
  guest_phone: string | null;
  guest_count: number;
  reservation_time: string;
  status: 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  special_requests: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTableReservationPayload {
  tableNumber: string;
  guestName: string;
  guestPhone?: string;
  guestCount?: number;
  reservationTime: string;
  specialRequests?: string;
  branchId?: number;
}

export const tableReservationsApi = {
  async listReservations(params?: { branchId?: number; date?: string }): Promise<TableReservation[]> {
    const res = await apiClient.get<TableReservation[]>('/api/sales/table-reservations', { params });
    return res.data;
  },

  async createReservation(payload: CreateTableReservationPayload): Promise<TableReservation> {
    const res = await apiClient.post<TableReservation>('/api/sales/table-reservations', payload);
    return res.data;
  },

  async updateStatus(id: number, status: 'confirmed' | 'seated' | 'cancelled' | 'no_show'): Promise<TableReservation> {
    const res = await apiClient.patch<TableReservation>(`/api/sales/table-reservations/${id}/status`, { status });
    return res.data;
  },

  async deleteReservation(id: number): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/api/sales/table-reservations/${id}`);
    return res.data;
  },
};
