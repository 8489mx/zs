import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';

function normalizePermissions(input: Array<string | null | undefined>) {
  return input.map((value) => String(value || '').trim()).filter(Boolean);
}

export function userHasAnyPermission(
  user: { role?: string | null; permissions?: string[] | null } | null | undefined,
  required: string | string[],
) {
  const needed = normalizePermissions(Array.isArray(required) ? required : [required]);
  if (!needed.length) return true;
  if (String(user?.role || '').trim() === 'super_admin') return true;
  const permissions = new Set(normalizePermissions(Array.isArray(user?.permissions) ? user.permissions : []));
  return needed.some((permission) => permissions.has(permission));
}

export function useHasAnyPermission(required: string | string[]) {
  const user = useAuthStore((state) => state.user);
  return useMemo(() => userHasAnyPermission(user, required), [user, required]);
}
