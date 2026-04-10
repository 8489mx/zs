import { defineApiContracts } from '@/lib/api/contracts';

export const purchasesApiContracts = defineApiContracts(
  { feature: 'purchases', name: 'list', method: 'GET', path: '/api/purchases', responseKey: 'purchases' },
  { feature: 'purchases', name: 'create', method: 'POST', path: '/api/purchases', responseKey: 'purchases' },
  { feature: 'purchases', name: 'products', method: 'GET', path: '/api/products', responseKey: 'products' },
  { feature: 'purchases', name: 'suppliers', method: 'GET', path: '/api/suppliers', responseKey: 'suppliers' }
);
