import { http } from '@/lib/http';

export interface PurchaseRfqItem {
  id?: number;
  product_id: number;
  product_name: string;
  unit_name?: string | null;
  target_quantity: number;
  specifications?: string | null;
}

export interface SupplierBidComparison {
  supplier_id: number;
  supplier_name: string;
  supplier_phone: string | null;
  delivery_lead_days: number;
  payment_terms: string | null;
  is_winner: boolean;
  total_quote: number;
  item_quotes: Record<number, { quoted_unit_cost: number; tax_rate: number }>;
}

export interface PurchaseRfq {
  id: number;
  rfq_number: string;
  title: string;
  status: 'draft' | 'sent' | 'bids_received' | 'evaluated' | 'converted_to_po' | 'cancelled';
  deadline_date: string | null;
  expected_delivery_date: string | null;
  winning_supplier_id: number | null;
  winning_supplier_name: string | null;
  awarded_supplier_id?: number | null;
  converted_po_id: number | null;
  notes: string | null;
  items_count?: number;
  suppliers_count?: number;
  items?: PurchaseRfqItem[];
  bids?: any[];
  comparison_matrix?: SupplierBidComparison[];
  created_at: string;
  updated_at: string;
}

export interface CreateRfqPayload {
  title: string;
  deadline_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: Array<{
    product_id: number;
    product_name: string;
    unit_name?: string;
    target_quantity: number;
    specifications?: string;
  }>;
}

export interface SubmitSupplierBidPayload {
  supplier_id: number;
  supplier_name: string;
  supplier_phone?: string;
  payment_terms?: string;
  delivery_lead_days?: number;
  notes?: string;
  item_bids: Array<{
    rfq_item_id: number;
    quoted_unit_cost: number;
    tax_rate?: number;
  }>;
}

export const purchaseRfqsApi = {
  list: async (): Promise<PurchaseRfq[]> => {
    const res = await http<{ data: PurchaseRfq[] }>('/api/purchases/rfqs');
    return res.data || [];
  },

  getOne: async (id: number): Promise<PurchaseRfq> => {
    const res = await http<{ data: PurchaseRfq }>(`/api/purchases/rfqs/${id}`);
    return res.data;
  },

  create: async (payload: CreateRfqPayload): Promise<PurchaseRfq> => {
    const res = await http<{ data: PurchaseRfq }>('/api/purchases/rfqs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  submitBid: async (rfqId: number, payload: SubmitSupplierBidPayload): Promise<void> => {
    await http(`/api/purchases/rfqs/${rfqId}/bids`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  selectWinner: async (
    rfqId: number,
    supplierId: number,
  ): Promise<{
    purchaseOrderId: number;
    orderNumber: string;
    winnerSupplierName: string;
  }> => {
    const res = await http<{
      data: {
        purchaseOrderId: number;
        orderNumber: string;
        winnerSupplierName: string;
      };
    }>(`/api/purchases/rfqs/${rfqId}/select-winner`, {
      method: 'POST',
      body: JSON.stringify({ supplier_id: supplierId }),
    });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await http(`/api/purchases/rfqs/${id}`, {
      method: 'DELETE',
    });
  },
};
