import { AppError } from '../../../common/errors/app-error';

/**
 * Returns true only for the configured platform tenant in SaaS mode. Legacy
 * aliases remain valid for self-contained/desktop installations, where they
 * are local defaults rather than cross-tenant platform identities.
 */
export function isPlatformTenantId(value: unknown): boolean {
  const tenantId = String(value ?? '').trim().toLowerCase();
  const configured = String(process.env.PLATFORM_TENANT_ID || 'zs').trim().toLowerCase();
  if (!tenantId || !configured) return false;
  const appMode = String(process.env.APP_MODE || 'CLOUD_SAAS').trim().toUpperCase();
  if (appMode === 'CLOUD_SAAS') return tenantId === configured;
  return [configured, 'zs', 'default', 'dev-tenant'].includes(tenantId);
}
import type { AuthContext } from '../interfaces/auth-context.interface';

export type TenantScope = {
  tenantId: string;
  accountId: string;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function requireTenantScope(auth: Pick<AuthContext, 'tenantId' | 'accountId'> | null | undefined): TenantScope {
  const tenantId = normalize(auth?.tenantId);
  const accountId = normalize(auth?.accountId);

  if (!tenantId || !accountId) {
    throw new AppError('Tenant/account scope is required', 'TENANT_SCOPE_REQUIRED', 403);
  }

  return { tenantId, accountId };
}
