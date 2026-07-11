import { AsyncLocalStorage } from 'async_hooks';

export interface IdempotencyContext {
  idempotencyKey?: string;
  operationType?: string;
}

export const idempotencyStorage = new AsyncLocalStorage<IdempotencyContext>();
