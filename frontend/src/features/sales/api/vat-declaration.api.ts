import { http } from '@/lib/http';

export interface VatDeclarationData {
  period: {
    from: string;
    to: string;
    country: 'EG' | 'SA';
    standard_rate_percent: number;
  };
  entity: {
    business_name: string;
    tax_id: string;
    owner_name: string;
  };
  output_tax: {
    standard_rated_base: number;
    standard_rated_tax: number;
    zero_rated_base: number;
    exempt_base: number;
    returns_base: number;
    returns_tax: number;
    invoices_count: number;
    total_sales_base: number;
    total_output_vat: number;
  };
  input_tax: {
    standard_rated_base: number;
    standard_rated_tax: number;
    zero_rated_base: number;
    exempt_base: number;
    returns_base: number;
    returns_tax: number;
    bills_count: number;
    total_purchases_base: number;
    total_input_vat: number;
  };
  summary: {
    gross_output_vat: number;
    deductible_input_vat: number;
    net_vat_due: number;
    status: 'payable' | 'refundable';
    currency: string;
  };
  egypt_form_10: {
    sales_general_rate_base: number;
    sales_general_rate_tax: number;
    sales_exports_base: number;
    sales_exempt_base: number;
    sales_credit_notes_tax: number;
    total_output_tax: number;
    purchases_general_rate_base: number;
    purchases_general_rate_tax: number;
    purchases_debit_notes_tax: number;
    total_input_tax: number;
    net_tax_payable: number;
    net_tax_credit: number;
  };
  zatca_return: {
    standard_rated_supplies_amount: number;
    standard_rated_supplies_tax: number;
    zero_rated_supplies_amount: number;
    exempt_supplies_amount: number;
    sales_adjustments_tax: number;
    total_sales_tax: number;
    standard_rated_purchases_amount: number;
    standard_rated_purchases_tax: number;
    imports_amount: number;
    purchases_adjustments_tax: number;
    total_purchases_tax: number;
    net_vat_due: number;
  };
}

export const vatDeclarationApi = {
  getDeclaration: async (params?: {
    from?: string;
    to?: string;
    country?: 'EG' | 'SA';
  }): Promise<VatDeclarationData> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.country) query.set('country', params.country);
    const qs = query.toString();
    return http<VatDeclarationData>(`/api/tax-integration/vat-declaration${qs ? `?${qs}` : ''}`);
  },
};
