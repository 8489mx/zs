import { http } from '@/lib/http';

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
  reservation_type?: 'reservation' | 'waitlist';
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
  reservationType?: 'reservation' | 'waitlist';
  specialRequests?: string;
  branchId?: number;
}

export const tableReservationsApi = {
  async listReservations(params?: { branchId?: number; date?: string; type?: 'reservation' | 'waitlist' }): Promise<TableReservation[]> {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branch', String(params.branchId));
    if (params?.date) query.set('date', params.date);
    if (params?.type) query.set('type', params.type);
    const qs = query.toString();
    const res = await http<{ reservations?: TableReservation[] } | TableReservation[]>(`/api/sales/table-reservations${qs ? `?${qs}` : ''}`);
    if (Array.isArray(res)) return res;
    return (res as any)?.reservations || [];
  },

  async createReservation(payload: CreateTableReservationPayload): Promise<TableReservation> {
    return http<TableReservation>('/api/sales/table-reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: number, status: 'confirmed' | 'seated' | 'cancelled' | 'no_show', tableNumber?: string): Promise<TableReservation> {
    return http<TableReservation>(`/api/sales/table-reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, tableNumber }),
    });
  },

  async deleteReservation(id: number): Promise<{ success: boolean }> {
    return http<{ success: boolean }>(`/api/sales/table-reservations/${id}`, {
      method: 'DELETE',
    });
  },
};
