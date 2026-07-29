import { create } from 'zustand';
import { DEFAULT_STORE_NAME, DEFAULT_THEME } from '@/config/app-defaults';
import type { AuthTenant, AuthUser } from '@/types/auth';
import type { ActivationStatusResponse } from '@/types/activation';

export { DEFAULT_STORE_NAME, DEFAULT_THEME };

export const isAdminUser = (user: AuthUser | null | undefined): boolean => {
  return user?.role === 'admin' || user?.role === 'super_admin';
};

export const isSuperAdmin = (user: AuthUser | null | undefined): boolean => {
  return user?.role === 'super_admin';
};

export type AppGate = 'loading' | 'activation' | 'setup' | 'login' | 'ready';

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  storeName: string;
  language: 'ar' | 'en';
  isEtaActive: boolean;
  initialized: boolean;
  appGate: AppGate;
  activationStatus: ActivationStatusResponse | null;
  setSession: (payload: { user: AuthUser; tenant?: AuthTenant | null; storeName: string; theme: string; language?: 'ar' | 'en' }) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  updateSessionMeta: (patch: { storeName?: string; theme?: string; language?: 'ar' | 'en'; tenant?: AuthTenant | null; isEtaActive?: boolean }) => void;
  clearSession: () => void;
  markInitialized: () => void;
  setAppGate: (gate: AppGate, activationStatus?: ActivationStatusResponse | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  storeName: DEFAULT_STORE_NAME,
  theme: DEFAULT_THEME,
  language: 'ar',
  isEtaActive: false,
  initialized: false,
  appGate: 'loading',
  activationStatus: null,
  setSession: ({ user, tenant = null, storeName, theme, language = 'ar', isEtaActive = false }) => set({ user, tenant, storeName, theme, language, isEtaActive, initialized: true, appGate: 'ready' }),
  updateUser: (patch) => set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  updateSessionMeta: (patch) => set((state) => ({
    storeName: typeof patch.storeName === 'string' && patch.storeName.trim() ? patch.storeName : state.storeName,
    theme: typeof patch.theme === 'string' && patch.theme.trim() ? patch.theme : state.theme,
    language: patch.language ? patch.language : state.language,
    tenant: patch.tenant !== undefined ? patch.tenant : state.tenant,
    isEtaActive: patch.isEtaActive !== undefined ? patch.isEtaActive : state.isEtaActive,
  })),
  clearSession: () => set({ user: null, tenant: null, storeName: DEFAULT_STORE_NAME, theme: DEFAULT_THEME, language: 'ar', isEtaActive: false, initialized: true }),
  markInitialized: () => set({ initialized: true }),
  setAppGate: (gate, activationStatus = null) => set({ appGate: gate, activationStatus, initialized: gate !== 'loading' })
}));
