import { http } from '@/lib/http';
import type { AuthLoginResponse, AuthMeResponse } from '@/types/auth';

export interface LoginPayload {
  username: string;
  password: string;
}

export type LoginResponse = AuthLoginResponse;

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  login(payload: LoginPayload) {
    return http<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
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
  }
};
