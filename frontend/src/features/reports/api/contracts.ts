import { defineApiContracts } from '@/lib/api/contracts';

export const reportsApiContracts = defineApiContracts(
  { feature: 'reports', name: 'summary', method: 'GET', path: '/api/reports/summary' },
  { feature: 'reports', name: 'inventory', method: 'GET', path: '/api/reports/inventory' },
  { feature: 'reports', name: 'customerBalances', method: 'GET', path: '/api/reports/customer-balances', responseKey: 'customers' },
  { feature: 'reports', name: 'products', method: 'GET', path: '/api/products', responseKey: 'products' }
);
