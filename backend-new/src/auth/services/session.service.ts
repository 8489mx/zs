import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { createHash } from 'node:crypto';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import type { AuthContext } from '../interfaces/auth-context.interface';

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async resolveAuthContext(sessionId: string): Promise<AuthContext | null> {
    const row = await this.db
      .selectFrom('sessions as s')
      .innerJoin('users as u', 'u.id', 's.user_id')
      .select([
        's.id as session_id',
        's.expires_at',
        'u.id as user_id',
        'u.username',
        'u.role',
        'u.permissions_json',
        'u.is_active',
        'u.locked_until',
      ])
      .where('s.id', '=', sessionId)
      .executeTakeFirst();

    if (!row) return null;
    if (!row.is_active) return null;
    if (row.expires_at <= new Date()) return null;
    if (row.locked_until && row.locked_until > new Date()) return null;

    return {
      userId: row.user_id,
      sessionId: row.session_id,
      username: row.username,
      role: row.role,
      permissions: safeJsonArray(row.permissions_json),
    };
  }

  async listSessions(userId: number): Promise<Array<Record<string, unknown>>> {
    return this.db
      .selectFrom('sessions')
      .select(['id', 'created_at', 'expires_at', 'last_seen_at', 'ip_address', 'user_agent'])
      .where('user_id', '=', userId)
      .orderBy('created_at desc')
      .execute();
  }

  async revokeSessionForUser(sessionId: string, userId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('sessions')
      .where('id', '=', sessionId)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  async revokeOtherSessions(userId: number, keepSessionId: string): Promise<number> {
    const result = await this.db
      .deleteFrom('sessions')
      .where('user_id', '=', userId)
      .where('id', '!=', keepSessionId)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'password_hash', 'password_salt'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new Error('User not found');
    }

    if (hashPassword(currentPassword, user.password_salt) !== user.password_hash) {
      throw new Error('Current password is incorrect');
    }

    await this.db
      .updateTable('users')
      .set({
        password_hash: hashPassword(newPassword, user.password_salt),
        must_change_password: false,
        failed_login_count: 0,
        locked_until: null,
      })
      .where('id', '=', userId)
      .execute();
  }

  async buildMePayload(auth: AuthContext): Promise<Record<string, unknown>> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'must_change_password', 'password_hash', 'password_salt', 'role', 'username'])
      .where('id', '=', auth.userId)
      .executeTakeFirst();

    if (!user) {
      throw new Error('User not found');
    }

    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME ?? 'ZS';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'infoadmin';
    const usingDefaultAdminPassword =
      user.role === 'super_admin'
      && user.username.toLowerCase() === defaultUsername.toLowerCase()
      && hashPassword(defaultPassword, user.password_salt) === user.password_hash;

    return {
      user: {
        id: auth.userId,
        username: auth.username,
        role: auth.role,
        permissions: auth.permissions,
      },
      security: {
        mustChangePassword: Boolean(user.must_change_password),
        usingDefaultAdminPassword,
      },
    };
  }
}
