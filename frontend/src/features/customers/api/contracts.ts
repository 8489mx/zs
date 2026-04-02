import { defineApiContracts } from '@/lib/api/contracts';

export const customersApiContracts = defineApiContracts(
  { feature: 'customers', name: 'list', method: 'GET', path: '/api/customers', responseKey: 'customers' },
  { feature: 'customers', name: 'create', method: 'POST', path: '/api/customers', responseKey: 'customers' },
  { feature: 'customers', name: 'balances', method: 'GET', path: '/api/reports/customer-balances', responseKey: 'customers' },
  { feature: 'customers', name: 'ledger', method: 'GET', path: '/api/reports/customers/:id/ledger' }
);
