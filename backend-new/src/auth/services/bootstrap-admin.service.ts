import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely } from 'kysely';
import { createHash, randomBytes } from 'node:crypto';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingAdmin = await this.db
      .selectFrom('users')
      .select('id')
      .where('role', '=', 'super_admin')
      .limit(1)
      .executeTakeFirst();

    if (existingAdmin) return;

    const username = this.configService.get<string>('DEFAULT_ADMIN_USERNAME') || 'ZS';
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || 'infoadmin';
    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    await this.db
      .insertInto('users')
      .values({
        username,
        password_hash: passwordHash,
        password_salt: salt,
        role: 'super_admin',
        is_active: true,
        permissions_json: [],
        branch_ids_json: [],
        default_branch_id: null,
        display_name: username,
        failed_login_count: 0,
        locked_until: null,
        last_login_at: null,
        must_change_password: false,
      })
      .onConflict((oc) => oc.column('username').doNothing())
      .execute();
  }
}
