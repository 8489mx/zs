import { defineApiContracts } from '@/lib/api/contracts';

export const salesApiContracts = defineApiContracts(
  { feature: 'sales', name: 'list', method: 'GET', path: '/api/sales', responseKey: 'sales' },
  { feature: 'sales', name: 'create', method: 'POST', path: '/api/sales', responseKey: 'sale' },
  { feature: 'sales', name: 'products', method: 'GET', path: '/api/products', responseKey: 'products' }
);
