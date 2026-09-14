import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';

function normalizePermissions(input: Array<string | null | undefined>) {
  return input.map((value) => String(value || '').trim()).filter(Boolean);
}

export function userHasAnyPermission(
  user: { role?: string | null; permissions?: string[] | null } | null | undefined,
  required: string | string[],
) {
  const needed = normalizePermissions(Array.isArray(required) ? required : [required]);
  if (!needed.length) return true;
  if (String(user?.role || '').trim() === 'super_admin' || String(user?.role || '').trim() === 'platform_admin') return true;
  const permissions = new Set(normalizePermissions(Array.isArray(user?.permissions) ? user.permissions : []));
  return needed.some((permission) => permissions.has(permission));
}

export function useHasAnyPermission(required: string | string[]) {
  const user = useAuthStore((state) => state.user);
  return useMemo(() => userHasAnyPermission(user, required), [user, required]);
}

export function useHasFeature(feature: string) {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  return useMemo(() => {
    if (isPlatformAdmin(user)) return true;
    if (!tenant) return true;

    const rawActivity = String(tenant?.activityType || tenant?.pillar || '').trim().toLowerCase();
    const isContracting = rawActivity === 'contracting' || rawActivity === 'construction' || rawActivity === 'مقاولات';
    const isMaritime = rawActivity === 'maritime_freight' || rawActivity === 'maritime' || rawActivity === 'freight' || rawActivity === 'shipping' || rawActivity === 'شحن';
    const isManufacturing = rawActivity === 'manufacturing' || rawActivity === 'production' || rawActivity === 'تصنيع' || rawActivity === 'مصنع';
    const isCommerce = !isContracting && !isMaritime && !isManufacturing;

    if (isContracting && ['contracting', 'purchases', 'inventory', 'catalog', 'products', 'suppliers', 'customers', 'crm', 'accounting', 'hr', 'fixed_assets', 'vat_declaration', 'reports', 'approvals', 'treasury'].includes(feature)) {
      return true;
    }
    if (isMaritime && ['maritime_freight', 'purchases', 'suppliers', 'customers', 'crm', 'sales', 'accounting', 'hr', 'vat_declaration', 'reports', 'approvals', 'treasury'].includes(feature)) {
      return true;
    }
    if (isManufacturing && ['manufacturing', 'purchases', 'inventory', 'catalog', 'products', 'suppliers', 'customers', 'crm', 'sales', 'pricing', 'accounting', 'hr', 'fixed_assets', 'vat_declaration', 'reports', 'approvals', 'treasury'].includes(feature)) {
      return true;
    }
    if (isCommerce && ['catalog', 'products', 'sales', 'purchases', 'inventory', 'accounting', 'hr', 'crm', 'pricing', 'suppliers', 'customers', 'treasury', 'expenses', 'reports', 'installments'].includes(feature)) {
      return true;
    }

    if (!tenant?.features || !Array.isArray(tenant.features)) return false;
    if (feature === 'catalog' && (tenant.features.includes('inventory') || tenant.features.includes('products'))) return true;
    if (feature === 'inventory' && (tenant.features.includes('catalog') || tenant.features.includes('products'))) return true;
    if (feature === 'products' && (tenant.features.includes('catalog') || tenant.features.includes('inventory'))) return true;
    return tenant.features.includes(feature);
  }, [user, tenant, feature]);
}

