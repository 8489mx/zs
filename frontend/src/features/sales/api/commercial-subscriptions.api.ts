import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';

export interface SubscriptionLine {
  id?: string;
  productId?: number;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  totalPrice?: number;
}

export interface CommercialSubscription {
  id: string;
  contract_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  billing_period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  next_billing_date: string;
  auto_renew: boolean;
  recurring_amount: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  payment_method: string;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  last_generated_invoice_id?: number | null;
  last_generated_at?: string | null;
  invoices_count: number;
  created_at: string;
  lines?: SubscriptionLine[];
}

export interface CreateSubscriptionPayload {
  contractNumber?: string;
  customerId: number;
  billingPeriod: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  paymentMethod?: string;
  notes?: string;
  lines: Array<{
    productId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export const commercialSubscriptionsApi = {
  list: async (params?: { status?: string; search?: string }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<CommercialSubscription[]>(`/api/sales/subscriptions${qs}`);
  },

  getById: async (id: string) => {
    return http<{ subscription: CommercialSubscription; lines: SubscriptionLine[] }>(
      `/api/sales/subscriptions/${id}`,
    );
  },

  create: async (payload: CreateSubscriptionPayload) => {
    return http<{ success: boolean; subscriptionId: string; contractNumber: string }>(
      '/api/sales/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  updateStatus: async (id: string, status: 'active' | 'paused' | 'cancelled') => {
    return http<{ success: boolean }>(`/api/sales/subscriptions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  generateDueInvoices: async () => {
    return http<{ processedCount: number; generatedInvoices: string[] }>(
      '/api/sales/subscriptions/generate-due',
      {
        method: 'POST',
      },
    );
  },
};
