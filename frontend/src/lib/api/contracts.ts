export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiContract {
  feature: string;
  name: string;
  method: ApiMethod;
  path: string;
  responseKey?: string;
}

export function defineApiContracts<T extends ApiContract[]>(...contracts: T): T {
  return contracts;
}

export function unwrapByKey<T>(payload: unknown, key: string, fallback: T): T {
  if (payload && typeof payload === 'object' && key in (payload as Record<string, unknown>)) {
    return (payload as Record<string, T>)[key] ?? fallback;
  }
  if (payload == null) return fallback;
  return payload as T;
}

export function unwrapArray<T>(payload: unknown, key: string): T[] {
  const value = unwrapByKey<T[] | null>(payload, key, []);
  return Array.isArray(value) ? value : [];
}

export function unwrapEntity<T>(payload: unknown, key: string): T {
  const value = unwrapByKey<T | null>(payload, key, null);
  if (value == null) {
    throw new Error(`Missing expected API entity: ${key}`);
  }
  return value;
}
