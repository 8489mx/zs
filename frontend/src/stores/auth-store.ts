import { create } from 'zustand';
import { DEFAULT_STORE_NAME, DEFAULT_THEME } from '@/config/app-defaults';
import type { AuthUser } from '@/types/auth';
import type { ActivationStatusResponse } from '@/types/activation';

export { DEFAULT_STORE_NAME, DEFAULT_THEME };

export type AppGate = 'loading' | 'activation' | 'setup' | 'login' | 'ready';

interface AuthState {
  user: AuthUser | null;
  storeName: string;
  theme: string;
  initialized: boolean;
  appGate: AppGate;
  activationStatus: ActivationStatusResponse | null;
  setSession: (payload: { user: AuthUser; storeName: string; theme: string }) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  updateSessionMeta: (patch: { storeName?: string; theme?: string }) => void;
  clearSession: () => void;
  markInitialized: () => void;
  setAppGate: (gate: AppGate, activationStatus?: ActivationStatusResponse | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  storeName: DEFAULT_STORE_NAME,
  theme: DEFAULT_THEME,
  initialized: false,
  appGate: 'loading',
  activationStatus: null,
  setSession: ({ user, storeName, theme }) => set({ user, storeName, theme, initialized: true, appGate: 'ready' }),
  updateUser: (patch) => set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  updateSessionMeta: (patch) => set((state) => ({
    storeName: typeof patch.storeName === 'string' && patch.storeName.trim() ? patch.storeName : state.storeName,
    theme: typeof patch.theme === 'string' && patch.theme.trim() ? patch.theme : state.theme,
  })),
  clearSession: () => set({ user: null, storeName: DEFAULT_STORE_NAME, theme: DEFAULT_THEME, initialized: true }),
  markInitialized: () => set({ initialized: true }),
  setAppGate: (gate, activationStatus = null) => set({ appGate: gate, activationStatus, initialized: gate !== 'loading' })
}));
