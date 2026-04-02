import { create } from 'zustand';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  storeName: string;
  theme: string;
  initialized: boolean;
  setSession: (payload: { user: AuthUser; storeName: string; theme: string }) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearSession: () => void;
  markInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  storeName: 'Z Systems',
  theme: 'light',
  initialized: false,
  setSession: ({ user, storeName, theme }) => set({ user, storeName, theme, initialized: true }),
  updateUser: (patch) => set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  clearSession: () => set({ user: null, initialized: true }),
  markInitialized: () => set({ initialized: true })
}));
