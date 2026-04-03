import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';

@Injectable()
export class SessionService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async findValidSession(sessionId: string): Promise<{ sessionId: string; userId: number } | null> {
    const now = new Date();
    const row = await this.db
      .selectFrom('sessions')
      .select(['id', 'user_id', 'expires_at'])
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!row || row.expires_at <= now) {
      return null;
    }

    return {
      sessionId: row.id,
      userId: row.user_id,
    };
  }
}
