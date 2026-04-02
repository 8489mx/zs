import { defineApiContracts } from '@/lib/api/contracts';

export const authApiContracts = defineApiContracts(
  { feature: 'auth', name: 'login', method: 'POST', path: '/api/auth/login' },
  { feature: 'auth', name: 'logout', method: 'POST', path: '/api/auth/logout' },
  { feature: 'auth', name: 'me', method: 'GET', path: '/api/auth/me' }
);
