import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import type { AuthContext } from '../auth/interfaces/auth-context.interface';

type AuditActor = number | Pick<AuthContext, 'userId' | 'tenantId' | 'accountId'>;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

@Injectable()
export class AuditService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async log(action: string, details: string, actor?: AuditActor): Promise<void> {
    const tenantId = typeof actor === 'number' ? '' : clean(actor?.tenantId);
    const accountId = typeof actor === 'number' ? '' : clean(actor?.accountId) || tenantId;

    await this.db
      .insertInto('audit_logs')
      .values({
        action,
        details,
        created_by: typeof actor === 'number' ? actor : (actor?.userId ?? null),
        tenant_id: tenantId,
        account_id: accountId,
      } as any)
      .execute();
  }
}
