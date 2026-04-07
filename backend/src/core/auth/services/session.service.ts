import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely } from 'kysely';
import { createHash, randomUUID } from 'node:crypto';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import type { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';

function safeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {}

  private get lockoutConfig() {
    return {
      maxAttempts: this.configService.get<number>('LOGIN_MAX_ATTEMPTS') ?? 5,
      lockoutMinutes: this.configService.get<number>('LOGIN_LOCKOUT_MINUTES') ?? 15,
    };
  }

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

  async authenticate(
    username: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ sessionId: string; auth: AuthContext; expiresAt: Date } | null> {
    const normalized = username.trim();

    const user = await this.db
      .selectFrom('users')
      .select([
        'id',
        'username',
        'password_hash',
        'password_salt',
        'role',
        'permissions_json',
        'is_active',
        'locked_until',
        'failed_login_count',
      ])
      .where('username', '=', normalized)
      .executeTakeFirst();

    if (!user) return null;
    if (!user.is_active) return null;
    if (user.locked_until && user.locked_until > new Date()) return null;

    const valid = hashPassword(password, user.password_salt) === user.password_hash;
    if (!valid) {
      const { maxAttempts, lockoutMinutes } = this.lockoutConfig;
      const nextFailedLoginCount = Number(user.failed_login_count ?? 0) + 1;
      const shouldLock = nextFailedLoginCount >= maxAttempts;

      await this.db
        .updateTable('users')
        .set({
          failed_login_count: shouldLock ? 0 : nextFailedLoginCount,
          locked_until: shouldLock ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : null,
        })
        .where('id', '=', user.id)
        .execute();
      return null;
    }

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.db
      .insertInto('sessions')
      .values({
        id: sessionId,
        user_id: user.id,
        expires_at: expiresAt,
        last_seen_at: now,
        ip_address: meta?.ipAddress?.slice(0, 255) || '',
        user_agent: meta?.userAgent?.slice(0, 500) || '',
      })
      .execute();

    await this.db
      .updateTable('users')
      .set({
        failed_login_count: 0,
        last_login_at: now,
        locked_until: null,
      })
      .where('id', '=', user.id)
      .execute();

    return {
      sessionId,
      expiresAt,
      auth: {
        userId: user.id,
        sessionId,
        username: user.username,
        role: user.role,
        permissions: safeJsonArray(user.permissions_json),
      },
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.db.deleteFrom('sessions').where('id', '=', sessionId).execute();
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

  async revokeAllSessionsForUser(userId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('sessions')
      .where('user_id', '=', userId)
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

    const settingsRows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .execute();

    const settingsMap = new Map(settingsRows.map((row) => [String(row.key || ''), String(row.value || '')]));

    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME ?? 'admin';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'ChangeMe123!';
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
      settings: {
        storeName: settingsMap.get('storeName') || 'Z Systems',
        theme: settingsMap.get('theme') || 'light',
      },
      security: {
        mustChangePassword: Boolean(user.must_change_password),
        usingDefaultAdminPassword,
      },
    };
  }
}
