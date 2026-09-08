import { http } from '@/lib/http';

export interface SalesOrderItem {
  id?: number;
  sales_order_id?: number;
  productId: number;
  productName: string;
  product_name?: string;
  unitName?: string;
  unit_name?: string;
  quantity: number;
  reserved_quantity?: number;
  delivered_quantity?: number;
  unitPrice: number;
  unit_price?: number;
  discount?: number;
  total: number;
  notes?: string;
  current_stock_qty?: number;
  current_reserved_qty?: number;
  available_qty?: number;
}

export interface SalesOrderRecord {
  id: number;
  tenant_id: string;
  account_id: string;
  order_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  branch_id: number | null;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  status: 'draft' | 'confirmed' | 'partially_delivered' | 'delivered' | 'converted' | 'cancelled';
  reservation_expires_at: string | null;
  delivery_date: string | null;
  sale_id: number | null;
  quotation_id: number | null;
  notes: string | null;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
  items?: SalesOrderItem[];
}

export interface CreateSalesOrderPayload {
  customerId?: number | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  branchId?: number | null;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  reservationExpiresAt?: string | null;
  deliveryDate?: string | null;
  quotationId?: number | null;
  notes?: string;
  termsConditions?: string;
  autoReserve?: boolean;
  items: Array<{
    productId: number;
    productName: string;
    unitName?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
    notes?: string;
  }>;
}

export interface SalesOrderSummaryResponse {
  orders: SalesOrderRecord[];
  summary: {
    all: number;
    draft: number;
    confirmed: number;
    converted: number;
    cancelled: number;
  };
}

export const salesOrdersApi = {
  list: (params?: { status?: string; search?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return http<SalesOrderSummaryResponse>(`/api/sales-orders${qs ? `?${qs}` : ''}`);
  },

  getById: (id: number) => http<SalesOrderRecord>(`/api/sales-orders/${id}`),

  create: (payload: CreateSalesOrderPayload) =>
    http<{ ok: boolean; message: string; order: SalesOrderRecord }>('/api/sales-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  confirmAndReserve: (id: number) =>
    http<{ ok: boolean; message: string }>(`/api/sales-orders/${id}/confirm-and-reserve`, {
      method: 'POST',
    }),

  cancel: (id: number) =>
    http<{ ok: boolean; message: string }>(`/api/sales-orders/${id}/cancel`, {
      method: 'POST',
    }),

  convertToSale: (id: number) =>
    http<{ ok: boolean; message: string; saleId: number; sale: any }>(`/api/sales-orders/${id}/convert-to-sale`, {
      method: 'POST',
    }),

  delete: (id: number) =>
    http<{ ok: boolean; message: string }>(`/api/sales-orders/${id}`, {
      method: 'DELETE',
    }),
};
