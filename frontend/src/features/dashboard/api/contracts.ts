import { defineApiContracts } from '@/lib/api/contracts';

export const dashboardApiContracts = defineApiContracts(
  { feature: 'dashboard', name: 'products', method: 'GET', path: '/api/products', responseKey: 'products' },
  { feature: 'dashboard', name: 'sales', method: 'GET', path: '/api/sales', responseKey: 'sales' },
  { feature: 'dashboard', name: 'purchases', method: 'GET', path: '/api/purchases', responseKey: 'purchases' },
  { feature: 'dashboard', name: 'customers', method: 'GET', path: '/api/customers', responseKey: 'customers' },
  { feature: 'dashboard', name: 'suppliers', method: 'GET', path: '/api/suppliers', responseKey: 'suppliers' },
  { feature: 'dashboard', name: 'summary', method: 'GET', path: '/api/reports/summary' },
  { feature: 'dashboard', name: 'overview', method: 'GET', path: '/api/dashboard/overview' }
);
