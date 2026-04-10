import { defineApiContracts } from '@/lib/api/contracts';

export const productsApiContracts = defineApiContracts(
  { feature: 'products', name: 'list', method: 'GET', path: '/api/products', responseKey: 'products' },
  { feature: 'products', name: 'create', method: 'POST', path: '/api/products', responseKey: 'products' },
  { feature: 'products', name: 'categories', method: 'GET', path: '/api/categories', responseKey: 'categories' },
  { feature: 'products', name: 'suppliers', method: 'GET', path: '/api/suppliers', responseKey: 'suppliers' }
);
