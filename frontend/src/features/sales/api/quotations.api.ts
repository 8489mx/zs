import { http } from '@/lib/http';

export interface QuotationItem {
  id?: number;
  productId: number;
  productName: string;
  unitName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
  notes?: string;
}

export interface QuotationRecord {
  id: number;
  tenant_id: string;
  account_id: string;
  quotation_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  branch_id: number | null;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  valid_until: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  sale_id: number | null;
  notes: string | null;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export interface CreateQuotationPayload {
  customerId?: number | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  branchId?: number | null;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
  termsConditions?: string;
  items: QuotationItem[];
}

export const quotationsApi = {
  list: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return http<{ quotations: QuotationRecord[] }>(`/api/quotations${qs ? `?${qs}` : ''}`);
  },

  getById: (id: number) => http<QuotationRecord>(`/api/quotations/${id}`),

  create: (payload: CreateQuotationPayload) =>
    http<{ ok: boolean; quotation: QuotationRecord }>('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: Partial<CreateQuotationPayload> & { status?: string }) =>
    http<{ ok: boolean; message: string }>(`/api/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    http<{ ok: boolean; message: string }>(`/api/quotations/${id}`, {
      method: 'DELETE',
    }),

  convertToSale: (id: number) =>
    http<{ ok: boolean; message: string; saleId: number; quotationId: number }>(`/api/quotations/${id}/convert-to-sale`, {
      method: 'POST',
    }),
};
