import { http } from '@/lib/http';
import type { Purchase, Sale } from '@/types/domain';

type AnyRecord = Record<string, unknown>;
type SaleDetailPayload = Sale | { sale?: Sale | null; data?: unknown; result?: unknown };
type PurchaseDetailPayload = Purchase | { purchase?: Purchase | null; data?: unknown; result?: unknown };

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' ? value as AnyRecord : null;
}

function unwrapByKey<T>(payload: unknown, key: 'sale' | 'purchase'): T {
  const record = asRecord(payload);
  if (!record) return payload as T;

  const direct = record[key];
  if (direct && typeof direct === 'object') return unwrapByKey<T>(direct, key);

  if (record.data && typeof record.data === 'object') return unwrapByKey<T>(record.data, key);
  if (record.result && typeof record.result === 'object') return unwrapByKey<T>(record.result, key);

  return payload as T;
}

export const documentDetailsApi = {
  saleById: async (id: string) => unwrapByKey<Sale>(await http<SaleDetailPayload>(`/api/sales/${id}`), 'sale'),
  purchaseById: async (id: string) => unwrapByKey<Purchase>(await http<PurchaseDetailPayload>(`/api/purchases/${id}`), 'purchase'),
};
