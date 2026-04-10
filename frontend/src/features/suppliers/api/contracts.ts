import { defineApiContracts } from '@/lib/api/contracts';

export const suppliersApiContracts = defineApiContracts(
  { feature: 'suppliers', name: 'list', method: 'GET', path: '/api/suppliers', responseKey: 'suppliers' },
  { feature: 'suppliers', name: 'create', method: 'POST', path: '/api/suppliers', responseKey: 'suppliers' },
  { feature: 'suppliers', name: 'ledger', method: 'GET', path: '/api/reports/suppliers/:id/ledger' }
);
