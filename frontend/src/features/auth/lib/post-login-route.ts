import { DEFAULT_STORE_NAME } from '@/config/app-defaults';
import type { AuthUser } from '@/types/auth';

const SETUP_ENTRY_ROUTE = '/settings/core?setup=1';

function normalizeValue(value: unknown) {
  return String(value || '').trim();
}

export function shouldStartSetupFlow(user: AuthUser | null | undefined, storeName: string | null | undefined) {
  if (!user || user.role !== 'super_admin') return false;
  if (user.usingDefaultAdminPassword === true) return true;
  return normalizeValue(storeName) === DEFAULT_STORE_NAME;
}

export function getPostLoginRoute(user: AuthUser | null | undefined, storeName: string | null | undefined) {
  return shouldStartSetupFlow(user, storeName) ? SETUP_ENTRY_ROUTE : '/';
}
