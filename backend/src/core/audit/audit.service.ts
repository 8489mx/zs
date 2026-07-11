import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import type { AuthContext } from '../auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../auth/utils/tenant-boundary';

type AuditActor = Pick<AuthContext, 'userId' | 'tenantId' | 'accountId'>;

@Injectable()
export class AuditService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async log(action: string, details: string, actor: AuditActor, options?: { targetTenantId?: string }): Promise<void> {
    await this.logWithExecutor(this.db, action, details, actor, options);
  }

  async logWithExecutor(executor: Kysely<Database>, action: string, details: string, actor: AuditActor, options?: { targetTenantId?: string }): Promise<void> {
    const scope = requireTenantScope(actor as AuthContext);
    await executor
      .insertInto('audit_logs')
      .values({
        action,
        details,
        target_tenant_id: options?.targetTenantId ?? null,
        created_by: actor.userId ?? null,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      } as any)
      .execute();
  }
}
