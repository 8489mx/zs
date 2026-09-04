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
  submitInvoices: async (invoiceIds: string[]): Promise<{ success: boolean; count: number; message: string; submissionId?: string }> => {
    return http('/api/tax-integration/eta/invoices/submit', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds })
    });
  },
  checkSubmissionStatus: async (submissionId: string) => {
    return http<{ success: boolean; data: any }>(`/api/tax-integration/eta/invoices/status/${encodeURIComponent(submissionId)}`);
  },
  getDocument: async (uuid: string) => {
    return http<{ success: boolean; data: any }>(`/api/tax-integration/eta/invoices/doc/${encodeURIComponent(uuid)}`);
  },
  getZatcaPackage: async (saleId: string | number) => {
    return http<{
      success: boolean;
      data: {
        ublXml: string;
        invoiceHash: string;
        qrCodeBase64: string;
        digitalSignature: string;
        publicKey: string;
      };
    }>(`/api/tax-integration/zatca/invoice/${saleId}`);
  },
  getZatcaQr: async (saleId: string | number) => {
    return http<{
      success: boolean;
      data: {
        qrCodeBase64: string;
        invoiceHash: string;
        digitalSignature: string;
      };
    }>(`/api/tax-integration/zatca/invoice/${saleId}/qr`);
  }
};


