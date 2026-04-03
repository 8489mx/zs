import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { AuditService } from '../audit/audit.service';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { AuthContext } from '../auth/interfaces/auth-context.interface';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function mapUser(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(row.id),
    username: row.username,
    role: row.role,
    permissions: safeJsonArray(String(row.permissions_json || '[]')),
    name: row.display_name || row.username,
    branchIds: safeJsonArray(String(row.branch_ids_json || '[]')),
    defaultBranchId: row.default_branch_id ? String(row.default_branch_id) : '',
    isActive: Boolean(row.is_active),
    mustChangePassword: Boolean(row.must_change_password),
    failedLoginCount: Number(row.failed_login_count || 0),
    lockedUntil: row.locked_until || null,
    lastLoginAt: row.last_login_at || null,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  private async ensureUniqueUsername(username: string, excludeId?: number): Promise<void> {
    const row = await this.db
      .selectFrom('users')
      .select(['id'])
      .where(sql`LOWER(username)`, '=', username.toLowerCase())
      .executeTakeFirst();

    if (row && (!excludeId || Number(row.id) !== excludeId)) {
      throw new AppError('Username already exists', 'USERNAME_EXISTS', 400);
    }
  }

  async listUsers(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const search = String(query.search || '').trim().toLowerCase();
    const role = String(query.role || '').trim();
    const includeInactive = String(query.includeInactive || 'true') !== 'false';
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 10)));

    const allRows = await this.db.selectFrom('users').selectAll().orderBy('id asc').execute();
    let users = allRows.map((row) => mapUser(row as unknown as Record<string, unknown>));

    if (!includeInactive) {
      users = users.filter((row) => row.isActive === true);
    }

    if (role) {
      users = users.filter((row) => String(row.role) === role);
    }

    if (search) {
      users = users.filter((row) => {
        const username = String(row.username || '').toLowerCase();
        const name = String(row.name || '').toLowerCase();
        return username.includes(search) || name.includes(search);
      });
    }

    const start = (page - 1) * pageSize;
    const rows = users.slice(start, start + pageSize);
    const active = users.filter((row) => row.isActive).length;

    return {
      users: rows,
      pagination: {
        page,
        pageSize,
        total: users.length,
        totalPages: users.length === 0 ? 1 : Math.ceil(users.length / pageSize),
      },
      summary: {
        total: users.length,
        active,
        inactive: users.length - active,
      },
    };
  }

  async createUser(payload: UpsertUserDto, actor: AuthContext): Promise<Record<string, unknown>> {
    if (!payload.password) {
      throw new AppError('Password is required', 'PASSWORD_REQUIRED', 400);
    }

    await this.ensureUniqueUsername(payload.username);

    const salt = randomBytes(16).toString('hex');
    const result = await this.db
      .insertInto('users')
      .values({
        username: payload.username.trim(),
        password_hash: hashPassword(payload.password, salt),
        password_salt: salt,
        role: payload.role,
        is_active: payload.isActive !== false,
        permissions_json: JSON.stringify(payload.permissions ?? []),
        display_name: payload.name?.trim() || payload.username.trim(),
        branch_ids_json: JSON.stringify(payload.branchIds ?? []),
        default_branch_id: payload.defaultBranchId ? Number(payload.defaultBranchId) : null,
        must_change_password: payload.mustChangePassword === true,
        failed_login_count: 0,
        locked_until: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const created = await this.db.selectFrom('users').selectAll().where('id', '=', Number(result.id)).executeTakeFirstOrThrow();
    await this.audit.log('إضافة مستخدم', `تمت إضافة المستخدم ${created.username} بواسطة ${actor.username}`, actor.userId);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    return {
      ok: true,
      user: mapUser(created as unknown as Record<string, unknown>),
      users: usersState.users,
    };
  }

  async updateUser(id: number, payload: UpsertUserDto, actor: AuthContext, keepSessionId?: string): Promise<Record<string, unknown>> {
    const existing = await this.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
    if (!existing) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    await this.ensureUniqueUsername(payload.username, id);

    const updates: Record<string, unknown> = {
      username: payload.username.trim(),
      role: payload.role,
      is_active: payload.isActive !== false,
      permissions_json: JSON.stringify(payload.permissions ?? []),
      display_name: payload.name?.trim() || payload.username.trim(),
      branch_ids_json: JSON.stringify(payload.branchIds ?? []),
      default_branch_id: payload.defaultBranchId ? Number(payload.defaultBranchId) : null,
      must_change_password: payload.mustChangePassword === true,
    };

    if (payload.password) {
      updates.password_hash = hashPassword(payload.password, existing.password_salt);
      updates.must_change_password = false;
      updates.failed_login_count = 0;
      updates.locked_until = null;
    }

    await this.db.updateTable('users').set(updates).where('id', '=', id).execute();

    let sessionCleanup = this.db.deleteFrom('sessions').where('user_id', '=', id);
    if (keepSessionId) {
      sessionCleanup = sessionCleanup.where('id', '!=', keepSessionId);
    }
    await sessionCleanup.execute();

    const updated = await this.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
    await this.audit.log('تعديل مستخدم', `تم تحديث المستخدم ${updated.username} بواسطة ${actor.username}`, actor.userId);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    return {
      ok: true,
      user: mapUser(updated as unknown as Record<string, unknown>),
      users: usersState.users,
    };
  }

  async syncUsers(usersPayload: UpsertUserDto[], actor: AuthContext, actorSessionId?: string): Promise<Record<string, unknown>> {
    if (!Array.isArray(usersPayload)) {
      throw new AppError('users payload must be an array', 'USERS_PAYLOAD_INVALID', 400);
    }

    for (const entry of usersPayload) {
      const id = Number((entry as unknown as { id?: string | number }).id || 0);
      if (id > 0) {
        await this.updateUser(id, entry, actor, Number(id) === actor.userId ? actorSessionId : undefined);
      } else {
        await this.createUser(entry, actor);
      }
    }

    await this.audit.log('تعديل المستخدمين', `تم تحديث ${usersPayload.length} مستخدم/صلاحية بواسطة ${actor.username}`, actor.userId);
    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });

    return {
      ok: true,
      users: usersState.users,
    };
  }

  async deleteUser(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
    if (!existing) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    await this.db.deleteFrom('sessions').where('user_id', '=', id).execute();
    await this.db.deleteFrom('users').where('id', '=', id).execute();
    await this.audit.log('حذف مستخدم', `تم حذف المستخدم ${existing.username} بواسطة ${actor.username}`, actor.userId);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    return {
      ok: true,
      removedUserId: String(existing.id),
      users: usersState.users,
    };
  }

  async unlockUser(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
    if (!existing) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    await this.db
      .updateTable('users')
      .set({
        failed_login_count: 0,
        locked_until: null,
      })
      .where('id', '=', id)
      .execute();

    const updated = await this.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
    await this.audit.log('فتح مستخدم', `تم فتح المستخدم ${updated.username} بواسطة ${actor.username}`, actor.userId);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    return {
      ok: true,
      user: mapUser(updated as unknown as Record<string, unknown>),
      users: usersState.users,
    };
  }
}
