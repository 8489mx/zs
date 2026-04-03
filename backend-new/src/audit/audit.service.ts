import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../database/database.types';
import { KYSELY_DB } from '../database/database.constants';

@Injectable()
export class AuditService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async log(action: string, details: string, createdBy?: number): Promise<void> {
    await this.db
      .insertInto('audit_logs')
      .values({
        action,
        details,
        created_by: createdBy ?? null,
      })
      .execute();
  }
}
