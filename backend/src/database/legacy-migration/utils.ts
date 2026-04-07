import { DatabaseSync } from 'node:sqlite';
import { IdMap, MigrationLogger } from './types';

export function createLogger(): MigrationLogger {
  return {
    info(message: string) {
      process.stdout.write(`[migration] ${message}\n`);
    },
    warn(message: string) {
      process.stdout.write(`[migration][warn] ${message}\n`);
    },
    error(message: string) {
      process.stderr.write(`[migration][error] ${message}\n`);
    },
  };
}

export function initIdMap(): IdMap {
  return {
    users: new Map(),
    categories: new Map(),
    products: new Map(),
    customers: new Map(),
    suppliers: new Map(),
    sales: new Map(),
    purchases: new Map(),
    customerPayments: new Map(),
    supplierPayments: new Map(),
    customerLedger: new Map(),
    supplierLedger: new Map(),
  };
}

export function readAll<T>(db: DatabaseSync, query: string): T[] {
  return db.prepare(query).all() as T[];
}

export function asNumber(value: unknown, fallback = 0): number {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

export function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes'].includes(value.toLowerCase());
  return fallback;
}

export function normalizePaymentType(value: unknown): 'cash' | 'credit' {
  return asString(value, 'cash').toLowerCase() === 'credit' ? 'credit' : 'cash';
}

export function normalizePaymentChannel(value: unknown): 'cash' | 'card' | 'mixed' | 'credit' {
  const normalized = asString(value, 'cash').toLowerCase();
  if (normalized === 'card' || normalized === 'mixed' || normalized === 'credit') return normalized;
  return 'cash';
}
