import { Kysely } from 'kysely';
import { DatabaseSync } from 'node:sqlite';
import { Database } from '../database.types';

export interface MigrationLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface EntityCounters {
  scanned: number;
  inserted: number;
  skipped: number;
  errors: number;
}

export interface IdMap {
  users: Map<number, number>;
  categories: Map<number, number>;
  products: Map<number, number>;
  customers: Map<number, number>;
  suppliers: Map<number, number>;
  sales: Map<number, number>;
  purchases: Map<number, number>;
  customerPayments: Map<number, number>;
  supplierPayments: Map<number, number>;
  customerLedger: Map<number, number>;
  supplierLedger: Map<number, number>;
}

export interface MigrationContext {
  oldDb: DatabaseSync;
  newDb: Kysely<Database>;
  idMap: IdMap;
  logger: MigrationLogger;
}
