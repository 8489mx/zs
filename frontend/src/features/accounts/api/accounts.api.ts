import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import type { Customer, CustomerLedger, Supplier, SupplierLedger } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface LedgerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}



export const accountsApi = {
  customers: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/customers'), 'customers'),
  suppliers: async () => unwrapArray<Supplier>(await http<Supplier[] | { suppliers: Supplier[] }>('/api/suppliers'), 'suppliers'),
  customerBalances: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/reports/customer-balances'), 'customers'),
  customerLedger: (id: string, params?: LedgerQueryParams) => http<CustomerLedger>(`/api/reports/customers/${id}/ledger${buildQueryString(params || {})}`),
  supplierLedger: (id: string, params?: LedgerQueryParams) => http<SupplierLedger>(`/api/reports/suppliers/${id}/ledger${buildQueryString(params || {})}`),
  listAllCustomerLedger: async (id: string, search = '') => {
    const pageSize = 200;
    let page = 1;
    const entries: CustomerLedger['entries'] = [];
    let customer: CustomerLedger['customer'];
    let summary: CustomerLedger['summary'];
    while (true) {
      const payload = await accountsApi.customerLedger(id, { page, pageSize, search });
      customer = payload.customer;
      summary = payload.summary;
      entries.push(...(payload.entries || []));
      const totalPages = payload.pagination?.totalPages || 1;
      if (page >= totalPages) break;
      page += 1;
    }
    return { customer, entries, summary } as CustomerLedger;
  },
  listAllSupplierLedger: async (id: string, search = '') => {
    const pageSize = 200;
    let page = 1;
    const entries: SupplierLedger['entries'] = [];
    let supplier: SupplierLedger['supplier'];
    let summary: SupplierLedger['summary'];
    while (true) {
      const payload = await accountsApi.supplierLedger(id, { page, pageSize, search });
      supplier = payload.supplier;
      summary = payload.summary;
      entries.push(...(payload.entries || []));
      const totalPages = payload.pagination?.totalPages || 1;
      if (page >= totalPages) break;
      page += 1;
    }
    return { supplier, entries, summary } as SupplierLedger;
  },
  customerPaymentCreate: (payload: unknown) => http('/api/customer-payments', { method: 'POST', body: JSON.stringify(payload) }),
  supplierPaymentCreate: (payload: unknown) => http('/api/supplier-payments', { method: 'POST', body: JSON.stringify(payload) })
};