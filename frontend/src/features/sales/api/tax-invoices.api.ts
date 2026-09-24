import { http } from '@/lib/http';

export type EtaPendingInvoice = {
  id: string;
  doc_no: string | null;
  created_at: string;
  total: number;
  eta_status: string;
  customer_name: string | null;
};

export type ZatcaPendingInvoice = {
  id: string;
  doc_no: string | null;
  created_at: string;
  total: number;
  tax_amount: number;
  customer_name: string | null;
  zatca_status: string;
  zatca_invoice_type: string;
  zatca_uuid?: string | null;
  zatca_icv?: number | null;
  zatca_submitted_at?: string | null;
};

export type ZatcaSubmissionResult = {
  success: boolean;
  saleId: number;
  docNo: string | null;
  uuid: string;
  invoiceType: 'standard' | 'simplified';
  action: 'clearance' | 'reporting';
  status: 'cleared' | 'reported' | 'warning' | 'rejected' | 'failed';
  httpStatus?: number;
  validationResults?: any;
  message: string;
  clearedXml?: string | null;
};

export type ZatcaBulkSubmissionSummary = {
  success: boolean;
  total: number;
  cleared: number;
  reported: number;
  warning: number;
  rejected: number;
  failed: number;
  results: ZatcaSubmissionResult[];
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
  getZatcaPendingInvoices: async (): Promise<ZatcaPendingInvoice[]> => {
    const response = await http<{ success: boolean; data: ZatcaPendingInvoice[] }>('/api/tax-integration/zatca/invoices/pending');
    return response.data;
  },
  submitZatcaInvoice: async (saleId: string | number): Promise<{ success: boolean; data: ZatcaSubmissionResult }> => {
    return http(`/api/tax-integration/zatca/invoices/submit/${saleId}`, {
      method: 'POST',
    });
  },
  submitZatcaInvoicesBulk: async (invoiceIds: (string | number)[]): Promise<{ success: boolean; data: ZatcaBulkSubmissionSummary }> => {
    return http('/api/tax-integration/zatca/invoices/submit-bulk', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds }),
    });
  },
  getZatcaLogs: async (): Promise<any[]> => {
    const response = await http<{ success: boolean; data: any[] }>('/api/tax-integration/zatca/invoices/logs');
    return response.data;
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


