import { create } from 'zustand';
import { DEFAULT_STORE_NAME, DEFAULT_THEME } from '@/config/app-defaults';
import type { AuthUser } from '@/types/auth';

export { DEFAULT_STORE_NAME, DEFAULT_THEME };

interface AuthState {
  user: AuthUser | null;
  storeName: string;
  theme: string;
  initialized: boolean;
  setSession: (payload: { user: AuthUser; storeName: string; theme: string }) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  updateSessionMeta: (patch: { storeName?: string; theme?: string }) => void;
  clearSession: () => void;
  markInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  storeName: DEFAULT_STORE_NAME,
  theme: DEFAULT_THEME,
  initialized: false,
  setSession: ({ user, storeName, theme }) => set({ user, storeName, theme, initialized: true }),
  updateUser: (patch) => set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  updateSessionMeta: (patch) => set((state) => ({
    storeName: typeof patch.storeName === 'string' && patch.storeName.trim() ? patch.storeName : state.storeName,
    theme: typeof patch.theme === 'string' && patch.theme.trim() ? patch.theme : state.theme,
  })),
  clearSession: () => set({ user: null, storeName: DEFAULT_STORE_NAME, theme: DEFAULT_THEME, initialized: true }),
  markInitialized: () => set({ initialized: true })
}));
