import { defineApiContracts } from '@/lib/api/contracts';

export const accountsApiContracts = defineApiContracts(
  { feature: 'accounts', name: 'customers', method: 'GET', path: '/api/customers', responseKey: 'customers' },
  { feature: 'accounts', name: 'suppliers', method: 'GET', path: '/api/suppliers', responseKey: 'suppliers' },
  { feature: 'accounts', name: 'customerBalances', method: 'GET', path: '/api/reports/customer-balances', responseKey: 'customers' },
  { feature: 'accounts', name: 'customerLedger', method: 'GET', path: '/api/reports/customers/:id/ledger' },
  { feature: 'accounts', name: 'supplierLedger', method: 'GET', path: '/api/reports/suppliers/:id/ledger' },
  { feature: 'accounts', name: 'customerPaymentCreate', method: 'POST', path: '/api/customer-payments', responseKey: 'customers' },
  { feature: 'accounts', name: 'supplierPaymentCreate', method: 'POST', path: '/api/supplier-payments', responseKey: 'suppliers' }
);
