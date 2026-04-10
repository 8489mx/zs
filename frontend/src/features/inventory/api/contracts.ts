import { defineApiContracts } from '@/lib/api/contracts';

export const inventoryApiContracts = defineApiContracts(
  { feature: 'inventory', name: 'products', method: 'GET', path: '/api/products', responseKey: 'products' },
  { feature: 'inventory', name: 'stockCountSessions', method: 'GET', path: '/api/stock-count-sessions', responseKey: 'stockCountSessions' },
  { feature: 'inventory', name: 'inventoryReport', method: 'GET', path: '/api/reports/inventory' }
);
