import { Inject, Injectable } from '@nestjs/common';
import { sql, type Kysely } from '../../database/kysely';
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

  async listLocations(): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('stock_locations as l')
      .leftJoin('branches as b', 'b.id', 'l.branch_id')
      .select(['l.id', 'l.name', 'l.code', 'l.branch_id', 'b.name as branch_name'])
      .where('l.is_active', '=', true)
      .orderBy('l.id asc')
      .execute();

    return {
      locations: rows.map((row) => ({
        id: String(row.id),
        name: row.name || '',
        code: row.code || '',
        branchId: row.branch_id ? String(row.branch_id) : '',
        branchName: row.branch_name || '',
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

  async updateBranch(id: number, payload: { name?: string; code?: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);

    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    if (!name) throw new AppError('Branch name is required', 'BRANCH_NAME_REQUIRED', 400);

    await this.db.updateTable('branches').set({ name, code }).where('id', '=', id).execute();
    await this.audit.log('تعديل فرع', `تم تحديث الفرع #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, branchId: String(id), ...(await this.listBranches()) };
  }

  async deleteBranch(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);

    const linkedLocations = await this.db.selectFrom('stock_locations').select((eb) => eb.fn.countAll<number>().as('count')).where('branch_id', '=', id).where('is_active', '=', true).executeTakeFirstOrThrow();
    if (Number(linkedLocations.count || 0) > 0) {
      throw new AppError('Branch still has active locations', 'BRANCH_HAS_LOCATIONS', 400);
    }

    await this.db.updateTable('branches').set({ is_active: false }).where('id', '=', id).execute();
    await this.audit.log('حذف فرع', `تم إلغاء تفعيل الفرع #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, removedBranchId: String(id), ...(await this.listBranches()) };
  }

  async updateLocation(
    id: number,
    payload: { name?: string; code?: string; branchId?: string | number | null },
    actor: AuthContext,
  ): Promise<Record<string, unknown>> {
    const location = await this.db.selectFrom('stock_locations').select(['id']).where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!location) throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);

    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    const branchId = payload.branchId === '' || payload.branchId == null ? null : Number(payload.branchId);
    if (!name) throw new AppError('Location name is required', 'LOCATION_NAME_REQUIRED', 400);

    if (branchId !== null) {
      const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', branchId).where('is_active', '=', true).executeTakeFirst();
      if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);
    }

    await this.db.updateTable('stock_locations').set({ name, code, branch_id: branchId }).where('id', '=', id).execute();
    await this.audit.log('تعديل مخزن', `تم تحديث المخزن #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, locationId: String(id), ...(await this.listLocations()) };
  }

  async deleteLocation(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.db.selectFrom('stock_locations').select(['id']).where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!location) throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);

    const stockMovements = await this.db.selectFrom('stock_movements').select((eb) => eb.fn.countAll<number>().as('count')).where('location_id', '=', id).executeTakeFirstOrThrow();
    if (Number(stockMovements.count || 0) > 0) {
      throw new AppError('Location has stock history and cannot be deleted', 'LOCATION_HAS_HISTORY', 400);
    }

    await this.db.updateTable('stock_locations').set({ is_active: false }).where('id', '=', id).execute();
    await this.audit.log('حذف مخزن', `تم إلغاء تفعيل المخزن #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, removedLocationId: String(id), ...(await this.listLocations()) };
  }

}
