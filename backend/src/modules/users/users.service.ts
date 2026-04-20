import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AppError } from '../../common/errors/app-error';
import { paginateRows } from '../../common/utils/pagination';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AuditService } from '../../core/audit/audit.service';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { createPasswordRecord } from '../../core/auth/utils/password-hasher';
import { assertStrongPassword } from '../../core/auth/utils/password-policy';
import { ensureUsersPayload, filterUsers, mapUserRow, normalizeBranchIds, normalizeUserId, normalizeUserListQuery, summarizeUsers } from './helpers/users.helper';

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

  private async loadBranchMap(userIds: number[]): Promise<Map<number, string[]>> {
    const map = new Map<number, string[]>();
    if (!userIds.length) return map;

    const rows = await sql<{ user_id: number; branch_id: number }>`
      select user_id, branch_id
      from user_branches
      where user_id in (${sql.join(userIds)})
      order by user_id asc, branch_id asc
    `.execute(this.db);

    for (const row of rows.rows) {
      const userId = Number(row.user_id);
      const branchId = String(row.branch_id);
      const current = map.get(userId) ?? [];
      current.push(branchId);
      map.set(userId, current);
    }

    return map;
  }


  private async replaceUserBranches(userId: number, branchIds: string[] | undefined): Promise<void> {
    const normalized = normalizeBranchIds(branchIds);
    await sql`delete from user_branches where user_id = ${userId}`.execute(this.db);

    if (!normalized.length) return;

    const values = normalized.map((branchId) => sql`(${userId}, ${branchId})`);
    await sql`
      insert into user_branches (user_id, branch_id)
      values ${sql.join(values)}
      on conflict (user_id, branch_id) do nothing
    `.execute(this.db);
  }

  async listUsers(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const normalizedQuery = normalizeUserListQuery(query);

    const allRows = await this.db.selectFrom('users').selectAll().orderBy('id asc').execute();
    const branchMap = await this.loadBranchMap(allRows.map((row) => Number(row.id)));
    const users = filterUsers(
      allRows.map((row) => mapUserRow(row, branchMap.get(Number(row.id)) ?? [])),
      normalizedQuery,
    );

    const paged = paginateRows(users, query, { defaultSize: 10 });
    const summary = summarizeUsers(users);

    return {
      users: paged.rows,
      pagination: {
        page: paged.pagination.page,
        pageSize: paged.pagination.pageSize,
        total: users.length,
        totalPages: paged.pagination.totalPages,
      },
      summary,
    };
  }

  async createUser(payload: UpsertUserDto, actor: AuthContext): Promise<Record<string, unknown>> {
    if (!payload.password) {
      throw new AppError('Password is required', 'PASSWORD_REQUIRED', 400);
    }

    await this.ensureUniqueUsername(payload.username);
    assertStrongPassword(payload.password);

    const passwordRecord = await createPasswordRecord(payload.password);
    const result = await this.db
      .insertInto('users')
      .values(({
        username: payload.username.trim(),
        password_hash: passwordRecord.hash,
        password_salt: passwordRecord.salt,
        role: payload.role,
        is_active: payload.isActive !== false,
        permissions_json: JSON.stringify(payload.permissions ?? []),
        display_name: payload.name?.trim() || payload.username.trim(),
        default_branch_id: payload.defaultBranchId ? Number(payload.defaultBranchId) : null,
        must_change_password: payload.mustChangePassword === true,
        failed_login_count: 0,
        locked_until: null,
      } as any))
      .returning('id')
      .executeTakeFirstOrThrow();

    await this.replaceUserBranches(Number(result.id), payload.branchIds);

    const created = await this.db.selectFrom('users').selectAll().where('id', '=', Number(result.id)).executeTakeFirstOrThrow();
    await this.audit.log('إضافة مستخدم', `تمت إضافة المستخدم ${created.username} بواسطة ${actor.username}`, actor);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    const branchMap = await this.loadBranchMap([Number(result.id)]);
    return {
      ok: true,
      user: mapUserRow(created, branchMap.get(Number(result.id)) ?? []),
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
      default_branch_id: payload.defaultBranchId ? Number(payload.defaultBranchId) : null,
      must_change_password: payload.mustChangePassword === true,
    };

    if (payload.password) {
      assertStrongPassword(payload.password);
      const passwordRecord = await createPasswordRecord(payload.password);
      updates.password_hash = passwordRecord.hash;
      updates.password_salt = passwordRecord.salt;
      updates.must_change_password = false;
      updates.failed_login_count = 0;
      updates.locked_until = null;
    }

    await this.db.updateTable('users').set(updates as any).where('id', '=', id).execute();
    await this.replaceUserBranches(id, payload.branchIds);

    let sessionCleanup = this.db.deleteFrom('sessions').where('user_id', '=', id);
    if (keepSessionId) {
      sessionCleanup = sessionCleanup.where('id', '!=', keepSessionId);
    }
    await sessionCleanup.execute();

    const updated = await this.db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
    await this.audit.log('تعديل مستخدم', `تم تحديث المستخدم ${updated.username} بواسطة ${actor.username}`, actor);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    const branchMap = await this.loadBranchMap([id]);
    return {
      ok: true,
      user: mapUserRow(updated, branchMap.get(id) ?? []),
      users: usersState.users,
    };
  }

  async syncUsers(usersPayload: UpsertUserDto[], actor: AuthContext, actorSessionId?: string): Promise<Record<string, unknown>> {
    ensureUsersPayload(usersPayload);

    for (const entry of usersPayload) {
      const id = normalizeUserId((entry as unknown as { id?: string | number }).id);
      if (id > 0) {
        await this.updateUser(id, entry, actor, Number(id) === actor.userId ? actorSessionId : undefined);
      } else {
        await this.createUser(entry, actor);
      }
    }

    await this.audit.log('تعديل المستخدمين', `تم تحديث ${usersPayload.length} مستخدم/صلاحية بواسطة ${actor.username}`, actor);
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

    await sql`delete from user_branches where user_id = ${id}`.execute(this.db);
    await this.db.deleteFrom('sessions').where('user_id', '=', id).execute();
    await this.db.deleteFrom('users').where('id', '=', id).execute();
    await this.audit.log('حذف مستخدم', `تم حذف المستخدم ${existing.username} بواسطة ${actor.username}`, actor);

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
    await this.audit.log('فتح مستخدم', `تم فتح المستخدم ${updated.username} بواسطة ${actor.username}`, actor);

    const usersState = await this.listUsers({ includeInactive: true, page: 1, pageSize: 1000 });
    const branchMap = await this.loadBranchMap([id]);
    return {
      ok: true,
      user: mapUserRow(updated, branchMap.get(id) ?? []),
      users: usersState.users,
    };
  }
}
