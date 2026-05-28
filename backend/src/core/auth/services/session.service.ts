import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, sql } from 'kysely';
import { randomUUID } from 'node:crypto';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import type { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { createPasswordRecord, verifyPassword } from '../utils/password-hasher';
import { assertStrongPassword } from '../utils/password-policy';
import { resolveTenantContext } from '../utils/tenant-context';
import { requireTenantScope } from '../utils/tenant-boundary';

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

function toNonEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

  private scope(auth: AuthContext) {
    return requireTenantScope(auth);
  }

  private resolveUserTenantContext(user: { tenant_id?: string | null; account_id?: string | null }): { tenantId: string; accountId: string } {
    const tenantId = toNonEmpty(user.tenant_id);
    const accountId = toNonEmpty(user.account_id);
    if (tenantId || accountId) {
      return resolveTenantContext(this.configService, { tenantId, accountId });
    }
    return resolveTenantContext(this.configService);
  }

  private async assertTenantLoginAllowed(tenantId: string): Promise<void> {
    const normalizedTenantId = toNonEmpty(tenantId);
    if (!normalizedTenantId || normalizedTenantId === 'default') return;

    const tenant = await this.db
      .selectFrom('tenants')
      .select(['id', 'slug', 'status', 'trial_ends_at'])
      .where('id', '=', normalizedTenantId)
      .executeTakeFirst();

    // Preserve existing single-tenant/demo behavior until a formal tenant row exists.
    if (!tenant) return;

    if (tenant.status === 'suspended') {
      throw new UnauthorizedException('تم إيقاف هذه النسخة التجريبية. تواصل مع الدعم لتفعيلها.');
    }

    if (tenant.status === 'expired') {
      throw new UnauthorizedException('انتهت الفترة التجريبية لهذه النسخة. تواصل معنا لتفعيل الاشتراك.');
    }

    if (tenant.status === 'trial' && tenant.trial_ends_at <= new Date()) {
      await this.db
        .updateTable('tenants')
        .set({ status: 'expired', updated_at: new Date().toISOString() })
        .where('id', '=', tenant.id)
        .execute();
      throw new UnauthorizedException('انتهت الفترة التجريبية لهذه النسخة. تواصل معنا لتفعيل الاشتراك.');
    }
  }

  async resolveAuthContext(sessionId: string): Promise<AuthContext | null> {
    const row = await this.db
      .selectFrom('sessions as s')
      .innerJoin('users as u', 'u.id', 's.user_id')
      .select([
        's.id as session_id',
        's.user_id as session_user_id',
        's.tenant_id as session_tenant_id',
        's.account_id as session_account_id',
        's.expires_at',
        'u.id as user_id',
        'u.username',
        'u.role',
        'u.permissions_json',
        'u.is_active',
        'u.locked_until',
        'u.tenant_id',
        'u.account_id',
      ])
      .where('s.id', '=', sessionId)
      .executeTakeFirst();

    if (!row) return null;
    if (Number(row.session_user_id || 0) !== Number(row.user_id || 0)) return null;
    if (toNonEmpty(row.session_tenant_id) !== toNonEmpty(row.tenant_id)) return null;
    if (!row.is_active) return null;
    if (row.expires_at <= new Date()) return null;
    if (row.locked_until && row.locked_until > new Date()) return null;

    const tenantContext = this.resolveUserTenantContext(row);
    try {
      await this.assertTenantLoginAllowed(tenantContext.tenantId);
    } catch {
      return null;
    }

    return {
      userId: row.user_id,
      sessionId: row.session_id,
      username: row.username,
      role: row.role,
      permissions: safeJsonArray(row.permissions_json),
      ...tenantContext,
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
        'tenant_id',
        'account_id',
      ])
      .where('username', '=', normalized)
      .executeTakeFirst();

    if (!user) return null;
    if (!user.is_active) return null;
    if (user.locked_until && user.locked_until > new Date()) return null;

    const passwordCheck = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!passwordCheck.valid) {
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

    const tenantContext = this.resolveUserTenantContext(user);
    await this.assertTenantLoginAllowed(tenantContext.tenantId);

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.db
      .insertInto('sessions')
      .values({
        id: sessionId,
        user_id: user.id,
        tenant_id: tenantContext.tenantId,
        account_id: tenantContext.accountId,
        expires_at: expiresAt,
        last_seen_at: now,
        ip_address: meta?.ipAddress?.slice(0, 255) || '',
        user_agent: meta?.userAgent?.slice(0, 500) || '',
      })
      .execute();

    const userSecurityUpdates: Record<string, unknown> = {
      failed_login_count: 0,
      last_login_at: now,
      locked_until: null,
    };

    if (passwordCheck.needsRehash) {
      const upgradedPassword = await createPasswordRecord(password);
      userSecurityUpdates.password_hash = upgradedPassword.hash;
      userSecurityUpdates.password_salt = upgradedPassword.salt;
    }

    await this.db
      .updateTable('users')
      .set(userSecurityUpdates)
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
        ...tenantContext,
      },
    };
  }

  async logout(sessionId: string, auth?: AuthContext): Promise<void> {
    let query = this.db.deleteFrom('sessions').where('id', '=', sessionId);
    if (auth) {
      const { tenantId } = this.scope(auth);
      query = query.where(sql<boolean>`tenant_id = ${tenantId}`);
    }
    await query.execute();
  }

  async listSessions(auth: AuthContext, userId: number = auth.userId): Promise<Array<Record<string, unknown>>> {
    const { tenantId } = this.scope(auth);
    return this.db
      .selectFrom('sessions')
      .select(['id', 'created_at', 'expires_at', 'last_seen_at', 'ip_address', 'user_agent'])
      .where('user_id', '=', userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .orderBy('created_at desc')
      .execute();
  }

  async revokeSessionForUser(sessionId: string, auth: AuthContext, userId: number = auth.userId): Promise<number> {
    const { tenantId } = this.scope(auth);
    const result = await this.db
      .deleteFrom('sessions')
      .where('id', '=', sessionId)
      .where('user_id', '=', userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  async revokeOtherSessions(auth: AuthContext, keepSessionId: string, userId: number = auth.userId): Promise<number> {
    const { tenantId } = this.scope(auth);
    const result = await this.db
      .deleteFrom('sessions')
      .where('user_id', '=', userId)
      .where('id', '!=', keepSessionId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  async revokeAllSessionsForUser(auth: AuthContext, userId: number = auth.userId): Promise<number> {
    const { tenantId } = this.scope(auth);
    const result = await this.db
      .deleteFrom('sessions')
      .where('user_id', '=', userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }


  private async getSessionUserProfile(auth: AuthContext): Promise<{
    id: number;
    username: string;
    role: string;
    permissions: string[];
    displayName: string;
    branchIds: string[];
    defaultBranchId: string;
    tenantId: string;
    accountId: string;
    mustChangePassword: boolean;
    passwordHash: string;
    passwordSalt: string;
  }> {
    const { tenantId } = this.scope(auth);
    const user = await this.db
      .selectFrom('users')
      .select([
        'id',
        'username',
        'role',
        'permissions_json',
        'display_name',
        'default_branch_id',
        'must_change_password',
        'password_hash',
        'password_salt',
        'tenant_id',
        'account_id',
      ])
      .where('id', '=', auth.userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    if (!user) {
      throw new Error('User not found');
    }

    const branchRows = await this.db
      .selectFrom('user_branches')
      .select(['branch_id'])
      .where('user_id', '=', auth.userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();

    const branchIds = branchRows
      .map((row) => String(row.branch_id || '').trim())
      .filter(Boolean);

    const defaultBranchId = user.default_branch_id ? String(user.default_branch_id) : '';
    if (defaultBranchId && !branchIds.includes(defaultBranchId)) {
      branchIds.push(defaultBranchId);
    }

    return {
      id: Number(user.id),
      username: String(user.username || auth.username),
      role: String(user.role || auth.role),
      permissions: safeJsonArray(user.permissions_json) || auth.permissions,
      displayName: String(user.display_name || user.username || auth.username),
      branchIds,
      defaultBranchId,
      ...this.resolveUserTenantContext(user),
      mustChangePassword: Boolean(user.must_change_password),
      passwordHash: String(user.password_hash || ''),
      passwordSalt: String(user.password_salt || ''),
    };
  }

  async buildLoginPayload(auth: AuthContext): Promise<Record<string, unknown>> {
    const profile = await this.getSessionUserProfile(auth);
    return {
      user: {
        id: profile.id,
        username: profile.username,
        role: profile.role,
        permissions: profile.permissions,
        displayName: profile.displayName,
        branchIds: profile.branchIds,
        defaultBranchId: profile.defaultBranchId,
        tenantId: profile.tenantId,
        accountId: profile.accountId,
      },
      mustChangePassword: profile.mustChangePassword,
    };
  }

  async changePassword(auth: AuthContext, currentPassword: string, newPassword: string): Promise<void> {
    const { tenantId } = this.scope(auth);
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'password_hash', 'password_salt'])
      .where('id', '=', auth.userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    if (!user) {
      throw new Error('User not found');
    }

    const currentPasswordCheck = await verifyPassword(currentPassword, user.password_hash, user.password_salt);
    if (!currentPasswordCheck.valid) {
      throw new Error('Current password is incorrect');
    }

    assertStrongPassword(newPassword);

    const nextPassword = await createPasswordRecord(newPassword);

    await this.db
      .updateTable('users')
      .set({
        password_hash: nextPassword.hash,
        password_salt: nextPassword.salt,
        must_change_password: false,
        failed_login_count: 0,
        locked_until: null,
      })
      .where('id', '=', auth.userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();
  }

  async buildMePayload(auth: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId } = this.scope(auth);
    const profile = await this.getSessionUserProfile(auth);

    const settingsRows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();

    const settingsMap = new Map(settingsRows.map((row) => [String(row.key || ''), String(row.value || '')]));

    const defaultUsername = (this.configService.get<string>('DEFAULT_ADMIN_USERNAME') || 'admin').trim();
    const defaultPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || 'ChangeMe123!';
    const defaultPasswordCheck = await verifyPassword(defaultPassword, profile.passwordHash, profile.passwordSalt);
    const usingDefaultAdminPassword =
      profile.role === 'super_admin'
      && profile.username.toLowerCase() === defaultUsername.toLowerCase()
      && defaultPasswordCheck.valid;

    return {
      user: {
        id: profile.id,
        username: profile.username,
        role: profile.role,
        permissions: profile.permissions,
        displayName: profile.displayName,
        branchIds: profile.branchIds,
        defaultBranchId: profile.defaultBranchId,
        tenantId: profile.tenantId,
        accountId: profile.accountId,
      },
      settings: {
        storeName: settingsMap.get('storeName') || 'Z Systems',
        theme: settingsMap.get('theme') || 'light',
      },
      security: {
        mustChangePassword: profile.mustChangePassword,
        usingDefaultAdminPassword,
      },
    };
  }
}
