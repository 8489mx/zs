import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import type { AuthContext } from '../auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../auth/utils/tenant-boundary';

type AuditActor = Pick<AuthContext, 'userId' | 'tenantId' | 'accountId'>;

/** Stable event codes consumed by detection logic (fraud radar, alerting). */
export const AUDIT_EVENT_CODES = {
  POS_CART_ITEM_REMOVED: 'POS_CART_ITEM_REMOVED',
  POS_DRAFT_SALE_CANCELLED: 'POS_DRAFT_SALE_CANCELLED',
  POS_DISCOUNT_OVERRIDE: 'POS_DISCOUNT_OVERRIDE',
  POS_SALE_RETURN: 'POS_SALE_RETURN',
  SAAS_TENANT_TRIAL_CREATED: 'SAAS_TENANT_TRIAL_CREATED',
  SAAS_TENANT_ACTIVATED: 'SAAS_TENANT_ACTIVATED',
  SAAS_TENANT_SUSPENDED: 'SAAS_TENANT_SUSPENDED',
  SAAS_TENANT_EXPIRED: 'SAAS_TENANT_EXPIRED',
  SAAS_TENANT_TRIAL_EXTENDED: 'SAAS_TENANT_TRIAL_EXTENDED',
  SAAS_TENANT_DELETED: 'SAAS_TENANT_DELETED',
  SAAS_TENANT_PLAN_UPDATED: 'SAAS_TENANT_PLAN_UPDATED',
  SAAS_TENANT_SLUG_UPDATED: 'SAAS_TENANT_SLUG_UPDATED',
  SAAS_TENANT_PASSWORD_RESET: 'SAAS_TENANT_PASSWORD_RESET',
  SAAS_TENANT_OWNER_UNLOCKED: 'SAAS_TENANT_OWNER_UNLOCKED',
  SAAS_SUBSCRIPTION_RENEWED: 'SAAS_SUBSCRIPTION_RENEWED',
  SAAS_PAYMENT_RECORDED: 'SAAS_PAYMENT_RECORDED',
  SAAS_IMPERSONATION_STARTED: 'SAAS_IMPERSONATION_STARTED',
  SAAS_IMPERSONATION_ENDED: 'SAAS_IMPERSONATION_ENDED',
} as const;

export type AuditEventCode = (typeof AUDIT_EVENT_CODES)[keyof typeof AUDIT_EVENT_CODES];

type AuditLogOptions = { targetTenantId?: string; eventCode?: AuditEventCode | string };

@Injectable()
export class AuditService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async log(action: string, details: string, actor: AuditActor, options?: AuditLogOptions): Promise<void> {
    await this.logWithExecutor(this.db, action, details, actor, options);
  }

  async logWithExecutor(executor: Kysely<Database>, action: string, details: string, actor: AuditActor, options?: AuditLogOptions): Promise<void> {
    const scope = requireTenantScope(actor as AuthContext);
    await executor
      .insertInto('audit_logs')
      .values({
        action,
        details,
        // Stable machine-readable discriminator. Detection logic must key off this, never off the
        // human-facing `action` text, which is free to be reworded or translated.
        event_code: options?.eventCode ?? null,
        target_tenant_id: options?.targetTenantId ?? null,
        created_by: actor.userId ?? null,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      } as any)
      .execute();
  }
}
