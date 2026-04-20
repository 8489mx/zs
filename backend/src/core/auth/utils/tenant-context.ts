import type { ConfigService } from '@nestjs/config';
import type { AuthContext } from '../interfaces/auth-context.interface';

export type TenantContext = {
  tenantId: string;
  accountId: string;
};

function toNonEmpty(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

export function resolveTenantContext(
  configService: Pick<ConfigService, 'get'>,
  auth?: Pick<AuthContext, 'tenantId' | 'accountId'>,
): TenantContext {
  return {
    tenantId: toNonEmpty(auth?.tenantId, toNonEmpty(configService.get<string>('TENANT_ID'), 'default')),
    accountId: toNonEmpty(auth?.accountId, toNonEmpty(configService.get<string>('ACCOUNT_ID'), 'default')),
  };
}
