import { defineApiContracts } from '@/lib/api/contracts';

export const authApiContracts = defineApiContracts(
  { feature: 'auth', name: 'login', method: 'POST', path: '/api/auth/login' },
  { feature: 'auth', name: 'logout', method: 'POST', path: '/api/auth/logout' },
  { feature: 'auth', name: 'me', method: 'GET', path: '/api/auth/me' },
  { feature: 'auth', name: 'requestPasswordReset', method: 'POST', path: '/api/auth/password-reset/request' },
  { feature: 'auth', name: 'validatePasswordResetToken', method: 'POST', path: '/api/auth/password-reset/validate' },
  { feature: 'auth', name: 'confirmPasswordReset', method: 'POST', path: '/api/auth/password-reset/confirm' },
  { feature: 'auth', name: 'loginMfa', method: 'POST', path: '/api/auth/login/mfa' },
  { feature: 'auth', name: 'mfaStatus', method: 'GET', path: '/api/auth/mfa/status' },
  { feature: 'auth', name: 'mfaSetup', method: 'POST', path: '/api/auth/mfa/setup' },
  { feature: 'auth', name: 'mfaConfirm', method: 'POST', path: '/api/auth/mfa/confirm' },
  { feature: 'auth', name: 'mfaDisable', method: 'POST', path: '/api/auth/mfa/disable' },
  { feature: 'auth', name: 'mfaRegenerateRecoveryCodes', method: 'POST', path: '/api/auth/mfa/recovery-codes' }
);
