import { defineApiContracts } from '@/lib/api/contracts';

export const settingsApiContracts = defineApiContracts(
  { feature: 'settings', name: 'settings', method: 'GET', path: '/api/settings' },
  { feature: 'settings', name: 'update', method: 'PUT', path: '/api/settings' },
  { feature: 'settings', name: 'branches', method: 'GET', path: '/api/branches', responseKey: 'branches' },
  { feature: 'settings', name: 'createBranch', method: 'POST', path: '/api/branches', responseKey: 'branches' },
  { feature: 'settings', name: 'locations', method: 'GET', path: '/api/settings/locations', responseKey: 'locations' },
  { feature: 'settings', name: 'createLocation', method: 'POST', path: '/api/settings/locations', responseKey: 'locations' }
);
