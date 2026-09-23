import { http } from '@/lib/http';
import type { AuthLoginResponse, AuthMeResponse } from '@/types/auth';

export interface LoginPayload {
  username: string;
  password: string;
  companyCode?: string;
}

export type LoginResponse = AuthLoginResponse;

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface RequestPasswordResetPayload {
  email: string;
  companyCode?: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  confirmedAt: string | null;
  recoveryCodesRemaining: number;
  required: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  secretFormatted: string;
  otpauthUri: string;
}

export interface ValidatePasswordResetTokenResponse {
  ok: boolean;
  username: string;
  businessName: string;
  expiresAt: string;
}

export const authApi = {
  login(payload: LoginPayload) {
    return http<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedInterceptor: true,
    });
  },
  logout() {
    return http<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return http<AuthMeResponse>('/api/auth/me', { skipUnauthorizedInterceptor: true });
  },
  changePassword(payload: ChangePasswordPayload) {
    return http<{ ok: boolean; removedOtherSessions: number }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  dismissPasswordChange() {
    return http<{ ok: boolean }>('/api/auth/dismiss-password-change', {
      method: 'POST'
    });
  },
  // مسارات عامة: من نسي كلمة مروره لا يملك جلسة، فلا مُعترِض 401 عليها.
  requestPasswordReset(payload: RequestPasswordResetPayload) {
    return http<{ ok: boolean }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedInterceptor: true,
    });
  },
  validatePasswordResetToken(token: string) {
    return http<ValidatePasswordResetTokenResponse>('/api/auth/password-reset/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipUnauthorizedInterceptor: true,
    });
  },
  // الخطوة الثانية لتسجيل الدخول: عامة زي login نفسه — لسه مفيش جلسة.
  loginMfa(payload: { mfaToken: string; code: string }) {
    return http<LoginResponse>('/api/auth/login/mfa', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedInterceptor: true,
    });
  },
  mfaStatus() {
    return http<MfaStatusResponse>('/api/auth/mfa/status');
  },
  mfaSetup() {
    return http<MfaSetupResponse>('/api/auth/mfa/setup', { method: 'POST' });
  },
  mfaConfirm(code: string) {
    return http<{ recoveryCodes: string[] }>('/api/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  mfaDisable(payload: { currentPassword: string; code: string }) {
    return http<{ ok: boolean }>('/api/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  mfaRegenerateRecoveryCodes(code: string) {
    return http<{ recoveryCodes: string[] }>('/api/auth/mfa/recovery-codes', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  confirmPasswordReset(payload: { token: string; newPassword: string }) {
    return http<{ ok: boolean; username: string }>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedInterceptor: true,
    });
  }
};
