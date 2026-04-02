import type { AuthUser } from '@/types/auth';

const DEFAULT_STORE_NAME = 'Z Systems';

function normalizeValue(value: unknown) {
  return String(value || '').trim();
}

export function shouldStartSetupFlow(user: AuthUser | null | undefined, storeName: string | null | undefined) {
  if (!user || user.role !== 'super_admin') return false;
  if (user.usingDefaultAdminPassword === true) return true;
  return normalizeValue(storeName) === DEFAULT_STORE_NAME;
}

export function getPostLoginRoute(_user: AuthUser | null | undefined, _storeName: string | null | undefined) {
  return '/';
}
