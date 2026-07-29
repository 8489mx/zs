import { http } from '@/lib/http';

export type EtaPendingInvoice = {
  id: string;
  doc_no: string | null;
  created_at: string;
  total: number;
  eta_status: string;
  customer_name: string | null;
};

export const taxInvoicesApi = {
  getPendingInvoices: async (): Promise<EtaPendingInvoice[]> => {
    const response = await http<{ success: boolean; data: EtaPendingInvoice[] }>('/api/tax-integration/eta/invoices/pending');
    return response.data;
  },
  submitInvoices: async (invoiceIds: string[]): Promise<{ success: boolean; count: number; message: string }> => {
    return http('/api/tax-integration/eta/invoices/submit', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds })
    });
  }
};
