import { AppError } from '../../../common/errors/app-error';
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

