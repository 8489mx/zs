import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import { AppError } from '../../common/errors/app-error';
import * as crypto from 'crypto';

export interface IdempotencyReservation {
  tenantId: string;
  accountId: string;
  idempotencyKey: string;
  operationType: string;
  requestHash: string;
}

export interface IdempotencyResult {
  status: 'processing' | 'committed' | 'failed' | 'recovery_required';
  responsePayload?: any;
  errorCode?: string;
  documentId?: string;
}

@Injectable()
export class IdempotencyService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  /**
   * Generates a deterministic hash of the payload, ignoring volatile fields.
   */
  generateRequestHash(payload: any): string {
    const cleanPayload = this.stripVolatileFields(payload || {});
    // Sort keys recursively for deterministic serialization regardless of insertion order
    const serialized = JSON.stringify(this.sortKeysRecursively(cleanPayload)) || '{}';
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private sortKeysRecursively(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sortKeysRecursively(item));
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = this.sortKeysRecursively(obj[key]);
    }
    return sorted;
  }

  private stripVolatileFields(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    if (Array.isArray(payload)) return payload.map(item => this.stripVolatileFields(item));

    const clone = { ...payload };
    const volatileKeys = ['timestamp', 'clientTime', 'requestId']; // add more as needed
    for (const key of volatileKeys) {
      delete clone[key];
    }
    for (const key of Object.keys(clone)) {
      if (typeof clone[key] === 'object') {
        clone[key] = this.stripVolatileFields(clone[key]);
      }
    }
    return clone;
  }

  /**
   * Reserves an operation execution. Throws an error or returns previous result if it exists.
   * If it successfully reserves, it returns void, and the caller must proceed with the business transaction.
   */
  async reserveOperation(params: IdempotencyReservation): Promise<IdempotencyResult | null> {
    try {
      await this.db
        .insertInto('operation_executions')
        .values({
          tenant_id: params.tenantId,
          account_id: params.accountId,
          idempotency_key: params.idempotencyKey,
          operation_type: params.operationType,
          status: 'processing',
          request_hash: params.requestHash,
          created_at: sql`CURRENT_TIMESTAMP`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .execute();

      return null; // Reservation successful
    } catch (error: any) {
      // Catch unique constraint violation
      if (error.code === '23505' || error.message?.includes('UNIQUE') || error.message?.includes('duplicate key')) {
        const existing = await this.db
          .selectFrom('operation_executions')
          .selectAll()
          .where('tenant_id', '=', params.tenantId)
          .where('account_id', '=', params.accountId)
          .where('idempotency_key', '=', params.idempotencyKey)
          .where('operation_type', '=', params.operationType)
          .executeTakeFirst();

        if (!existing) {
          throw new AppError('Idempotency collision but record not found', 'IDEMPOTENCY_COLLISION_NOT_FOUND', 500);
        }

        if (existing.request_hash !== params.requestHash) {
          throw new AppError('Idempotency key reused with different payload', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD', 400);
        }

        if (existing.status === 'processing') {
          // Check for stale processing
          const ageMs = Date.now() - new Date(existing.updated_at).getTime();
          if (ageMs > 60000) { // 60 seconds threshold for stale processing
            return { status: 'recovery_required' };
          }
          return { status: 'processing' };
        }

        return {
          status: existing.status as any,
          responsePayload: existing.response_payload ? JSON.parse(existing.response_payload) : undefined,
          errorCode: existing.error_code || undefined,
          documentId: existing.document_id || undefined,
        };
      }
      throw error;
    }
  }

  /**
   * Records a confirmed failure outside the main transaction (or in a separate short transaction).
   */
  async recordFailure(params: Pick<IdempotencyReservation, 'tenantId' | 'accountId' | 'idempotencyKey' | 'operationType'>, errorCode: string, responsePayload?: any): Promise<void> {
    // Prevent overwriting a committed operation (Point #3)
    // Only update if it's currently processing and no document is linked
    await this.db
      .updateTable('operation_executions')
      .set({
        status: 'failed',
        error_code: errorCode,
        response_payload: responsePayload ? JSON.stringify(responsePayload) : null,
        updated_at: sql`CURRENT_TIMESTAMP`,
        completed_at: sql`CURRENT_TIMESTAMP`,
      })
      .where('tenant_id', '=', params.tenantId)
      .where('account_id', '=', params.accountId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .where('operation_type', '=', params.operationType)
      .where('status', '=', 'processing')
      .where('document_id', 'is', null)
      .execute();
  }

  /**
   * Commits the operation inside the business transaction.
   */
  async commitOperation(
    trx: Kysely<Database>,
    params: Pick<IdempotencyReservation, 'tenantId' | 'accountId' | 'idempotencyKey' | 'operationType'>,
    responsePayload: any,
    documentId?: string
  ): Promise<void> {
    await trx
      .updateTable('operation_executions')
      .set({
        status: 'committed',
        response_payload: JSON.stringify(responsePayload),
        document_id: documentId || null,
        updated_at: sql`CURRENT_TIMESTAMP`,
        completed_at: sql`CURRENT_TIMESTAMP`,
      })
      .where('tenant_id', '=', params.tenantId)
      .where('account_id', '=', params.accountId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .where('operation_type', '=', params.operationType)
      .execute();
  }

  /**
   * Checks if an operation is already processed.
   */
  async check(idempotencyKey: string, scope: { tenantId: string; accountId: string }): Promise<{ response: any } | null> {
    const record = await this.db
      .selectFrom('operation_executions')
      .selectAll()
      .where('idempotency_key', '=', idempotencyKey)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (record && record.status === 'committed') {
      return { response: record.response_payload ? JSON.parse(record.response_payload) : null };
    }
    return null;
  }
}
