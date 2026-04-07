import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  async getSettings(): Promise<Record<string, unknown>> {
    const rows = await this.db.selectFrom('settings').selectAll().execute();
    return rows.reduce<Record<string, unknown>>((acc, row) => {
      try {
        acc[row.key] = JSON.parse(row.value);
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});
  }

  async listBranches(): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('branches')
      .select(['id', 'name', 'code'])
      .where('is_active', '=', true)
      .orderBy('id asc')
      .execute();

    return {
      branches: rows.map((row) => ({
        id: String(row.id),
        name: row.name || '',
        code: row.code || '',
      })),
    };
  }

  async saveSettings(payload: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AppError('Settings payload must be an object', 'SETTINGS_INVALID', 400);
    }

    for (const [key, value] of Object.entries(payload)) {
      await this.db
        .insertInto('settings')
        .values({ key, value: JSON.stringify(value) })
        .onConflict((oc) => oc.column('key').doUpdateSet({ value: JSON.stringify(value) }))
        .execute();
    }

    await this.audit.log('تعديل الإعدادات', `تم تعديل الإعدادات بواسطة ${actor.username}`, actor.userId);
    return this.getSettings();
  }

  async createBranch(payload: { name?: string; code?: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();

    if (!name) {
      throw new AppError('Branch name is required', 'BRANCH_NAME_REQUIRED', 400);
    }

    const inserted = await this.db
      .insertInto('branches')
      .values({
        name,
        code,
        is_active: true,
      })
      .returning(['id', 'name', 'code'])
      .executeTakeFirstOrThrow();

    await this.audit.log('إضافة فرع', `تمت إضافة الفرع ${name} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      branch: {
        id: String(inserted.id),
        name: inserted.name || '',
        code: inserted.code || '',
      },
    };
  }

  async createLocation(
    payload: { name?: string; code?: string; branchId?: string | number | null },
    actor: AuthContext,
  ): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    const branchId = payload.branchId === '' || payload.branchId == null ? null : Number(payload.branchId);

    if (!name) {
      throw new AppError('Location name is required', 'LOCATION_NAME_REQUIRED', 400);
    }

    if (branchId !== null) {
      const branch = await this.db
        .selectFrom('branches')
        .select(['id'])
        .where('id', '=', branchId)
        .where('is_active', '=', true)
        .executeTakeFirst();

      if (!branch) {
        throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);
      }
    }

    const inserted = await this.db
      .insertInto('stock_locations')
      .values({
        name,
        code,
        branch_id: branchId,
        is_active: true,
      })
      .returning(['id', 'name', 'code', 'branch_id'])
      .executeTakeFirstOrThrow();

    await this.audit.log('إضافة مخزن', `تمت إضافة المخزن ${name} بواسطة ${actor.username}`, actor.userId);

    return {
      ok: true,
      location: {
        id: String(inserted.id),
        name: inserted.name || '',
        code: inserted.code || '',
        branchId: inserted.branch_id ? String(inserted.branch_id) : '',
      },
    };
  }
}
