import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import type { AuthContext } from '../auth/interfaces/auth-context.interface';

type AuditActor = number | Pick<AuthContext, 'userId' | 'tenantId' | 'accountId'>;

function toActorMetadata(actor?: AuditActor): Record<string, unknown> | null {
  if (!actor || typeof actor === 'number') {
    return null;
  }

  const metadata: Record<string, unknown> = {
    userId: actor.userId,
  };

  if (typeof actor.tenantId === 'string' && actor.tenantId.trim()) {
    metadata.tenantId = actor.tenantId.trim();
  }

  if (typeof actor.accountId === 'string' && actor.accountId.trim()) {
    metadata.accountId = actor.accountId.trim();
  }

  return metadata;
}

@Injectable()
export class AuditService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async log(action: string, details: string, actor?: AuditActor): Promise<void> {
    const actorMetadata = toActorMetadata(actor);
    const formattedDetails = actorMetadata
      ? `${details}\n[actor-scope] ${JSON.stringify(actorMetadata)}`
      : details;

    await this.db
      .insertInto('audit_logs')
      .values({
        action,
        details: formattedDetails,
        created_by: typeof actor === 'number' ? actor : (actor?.userId ?? null),
      })
      .execute();
  }
}
