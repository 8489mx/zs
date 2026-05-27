import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantScope = {
  tenantId: string;
  accountId: string;
};

const storage = new AsyncLocalStorage<TenantScope>();

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function runWithTenantScope<T>(scope: Partial<TenantScope>, callback: () => T): T {
  const tenantId = clean(scope.tenantId);
  const accountId = clean(scope.accountId) || tenantId;
  return storage.run({ tenantId, accountId }, callback);
}

export function enterTenantScope(scope: Partial<TenantScope>): void {
  const tenantId = clean(scope.tenantId);
  const accountId = clean(scope.accountId) || tenantId;
  storage.enterWith({ tenantId, accountId });
}

export function getTenantScope(): TenantScope | undefined {
  const scope = storage.getStore();
  if (!scope?.tenantId) return undefined;
  return scope;
}
