import { Inject, Injectable } from '@nestjs/common';
import { sql, type Kysely } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

@Injectable()
export class SettingsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>, private readonly audit: AuditService) {}

  private scope(actor: AuthContext) { return requireTenantScope(actor); }
  private tenantPredicate(actor: AuthContext, alias?: string) { const { tenantId } = this.scope(actor); return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}` : sql<boolean>`tenant_id = ${tenantId}`; }

  async getSettings(actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.scope(actor);
    const rows = await this.db.selectFrom('settings').selectAll().where(this.tenantPredicate(actor)).execute();
    const settings = rows.reduce<Record<string, unknown>>((acc, row) => { try { acc[row.key] = JSON.parse(row.value); } catch { acc[row.key] = row.value; } return acc; }, {});
    return { ...settings, scope };
  }

  async listBranches(actor: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db.selectFrom('branches').select(['id', 'name', 'code']).where('is_active', '=', true).where(this.tenantPredicate(actor)).orderBy('id', 'asc').execute();
    return { branches: rows.map((row) => ({ id: String(row.id), name: row.name || '', code: row.code || '' })), scope: this.scope(actor) };
  }

  async listLocations(actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.scope(actor);
    const rows = await this.db
      .selectFrom('stock_locations as l')
      .leftJoin('branches as b', (join) => join.onRef('b.id', '=', 'l.branch_id').on(sql<boolean>`b.tenant_id = ${scope.tenantId}`))
      .select(['l.id', 'l.name', 'l.code', 'l.branch_id', 'b.name as branch_name', 'l.is_active'])
      .where(this.tenantPredicate(actor, 'l'))
      .orderBy('l.id', 'asc')
      .execute();
    return { locations: rows.map((row) => ({ id: String(row.id), name: row.name + (!row.is_active ? ' (محذوف)' : ''), code: row.code || '', branchId: row.branch_id ? String(row.branch_id) : '', branchName: row.branch_name || '', isActive: row.is_active })), scope };
  }

  async saveSettings(payload: Record<string, unknown>, actor: AuthContext): Promise<Record<string, unknown>> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new AppError('Settings payload must be an object', 'SETTINGS_INVALID', 400);
    const scope = this.scope(actor);
    const currentBranchIdRaw = String(payload.currentBranchId ?? '').trim();
    const currentLocationIdRaw = String(payload.currentLocationId ?? '').trim();
    if (!currentBranchIdRaw || !currentLocationIdRaw) {
      throw new AppError('يجب اختيار الفرع الرئيسي والمخزن الأساسي قبل حفظ الإعدادات.', 'SETTINGS_MAIN_OPERATION_REQUIRED', 400);
    }

    const currentBranchId = Number(currentBranchIdRaw);
    const currentLocationId = Number(currentLocationIdRaw);
    if (!Number.isFinite(currentBranchId) || currentBranchId <= 0 || !Number.isFinite(currentLocationId) || currentLocationId <= 0) {
      throw new AppError('يجب اختيار الفرع الرئيسي والمخزن الأساسي قبل حفظ الإعدادات.', 'SETTINGS_MAIN_OPERATION_REQUIRED', 400);
    }

    const [branch, location] = await Promise.all([
      this.db
        .selectFrom('branches')
        .select(['id'])
        .where('id', '=', currentBranchId)
        .where('is_active', '=', true)
        .where(this.tenantPredicate(actor))
        .executeTakeFirst(),
      this.db
        .selectFrom('stock_locations')
        .select(['id', 'branch_id'])
        .where('id', '=', currentLocationId)
        .where('is_active', '=', true)
        .where(this.tenantPredicate(actor))
        .executeTakeFirst(),
    ]);

    if (!branch || !location || Number(location.branch_id || 0) !== currentBranchId) {
      throw new AppError('يجب اختيار الفرع الرئيسي والمخزن الأساسي قبل حفظ الإعدادات.', 'SETTINGS_MAIN_OPERATION_REQUIRED', 400);
    }

    const normalizedPayload = { ...payload };
    if ('uiLanguage' in normalizedPayload) {
      normalizedPayload.uiLanguage = String(normalizedPayload.uiLanguage || '').trim().toLowerCase() === 'en' ? 'en' : 'ar';
    }

    for (const [key, value] of Object.entries(normalizedPayload)) {
      await sql`insert into settings (key, value, tenant_id, account_id) values (${key}, ${JSON.stringify(value)}, ${scope.tenantId}, ${scope.accountId}) on conflict (tenant_id, key) do update set value = excluded.value, account_id = excluded.account_id`.execute(this.db);
    }
    await this.audit.log('تعديل الإعدادات', `تم تعديل الإعدادات بواسطة ${actor.username}`, actor);
    return this.getSettings(actor);
  }

  async createBranch(payload: { name?: string; code?: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.scope(actor);
    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    if (!name) throw new AppError('Branch name is required', 'BRANCH_NAME_REQUIRED', 400);
    const inserted = await this.db.insertInto('branches').values({ name, code, is_active: true, tenant_id: scope.tenantId, account_id: scope.accountId } as any).returning(['id', 'name', 'code']).executeTakeFirstOrThrow();
    await this.audit.log('إضافة فرع', `تمت إضافة الفرع ${name} بواسطة ${actor.username}`, actor);
    return { ok: true, branch: { id: String(inserted.id), name: inserted.name || '', code: inserted.code || '' }, ...(await this.listBranches(actor)) };
  }

  async createLocation(payload: { name?: string; code?: string; branchId?: string | number | null }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.scope(actor);
    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    const branchId = payload.branchId === '' || payload.branchId == null ? null : Number(payload.branchId);
    if (!name) throw new AppError('Location name is required', 'LOCATION_NAME_REQUIRED', 400);
    if (branchId !== null) {
      const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', branchId).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
      if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);
    }
    const inserted = await this.db.insertInto('stock_locations').values({ name, code, branch_id: branchId, is_active: true, tenant_id: scope.tenantId, account_id: scope.accountId } as any).returning(['id', 'name', 'code', 'branch_id']).executeTakeFirstOrThrow();
    await this.audit.log('إضافة مخزن', `تمت إضافة المخزن ${name} بواسطة ${actor.username}`, actor);
    return { ok: true, location: { id: String(inserted.id), name: inserted.name || '', code: inserted.code || '', branchId: inserted.branch_id ? String(inserted.branch_id) : '' }, ...(await this.listLocations(actor)) };
  }

  async updateBranch(id: number, payload: { name?: string; code?: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', id).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
    if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);
    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    if (!name) throw new AppError('Branch name is required', 'BRANCH_NAME_REQUIRED', 400);
    await this.db.updateTable('branches').set({ name, code }).where('id', '=', id).where(this.tenantPredicate(actor)).execute();
    await this.audit.log('تعديل فرع', `تم تحديث الفرع #${id} بواسطة ${actor.username}`, actor);
    return { ok: true, branchId: String(id), ...(await this.listBranches(actor)) };
  }

  async deleteBranch(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', id).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
    if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);
    const linkedLocations = await this.db.selectFrom('stock_locations').select((eb) => eb.fn.countAll<number>().as('count')).where('branch_id', '=', id).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirstOrThrow();
    if (Number(linkedLocations.count || 0) > 0) throw new AppError('Branch still has active locations', 'BRANCH_HAS_LOCATIONS', 400);
    await this.db.updateTable('branches').set({ is_active: false }).where('id', '=', id).where(this.tenantPredicate(actor)).execute();
    await this.audit.log('حذف فرع', `تم إلغاء تفعيل الفرع #${id} بواسطة ${actor.username}`, actor);
    return { ok: true, removedBranchId: String(id), ...(await this.listBranches(actor)) };
  }

  async updateLocation(id: number, payload: { name?: string; code?: string; branchId?: string | number | null }, actor: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.db.selectFrom('stock_locations').select(['id']).where('id', '=', id).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
    if (!location) throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);
    const name = String(payload.name || '').trim();
    const code = String(payload.code || '').trim();
    const branchId = payload.branchId === '' || payload.branchId == null ? null : Number(payload.branchId);
    if (!name) throw new AppError('Location name is required', 'LOCATION_NAME_REQUIRED', 400);
    if (branchId !== null) {
      const branch = await this.db.selectFrom('branches').select(['id']).where('id', '=', branchId).where('is_active', '=', true).where(this.tenantPredicate(actor)).executeTakeFirst();
      if (!branch) throw new AppError('Branch not found', 'BRANCH_NOT_FOUND', 404);
    }
    await this.db.updateTable('stock_locations').set({ name, code, branch_id: branchId }).where('id', '=', id).where(this.tenantPredicate(actor)).execute();
    await this.audit.log('تعديل مخزن', `تم تحديث المخزن #${id} بواسطة ${actor.username}`, actor);
    return { ok: true, locationId: String(id), ...(await this.listLocations(actor)) };
  }

  async deleteLocation(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.db.selectFrom('stock_locations').select(['id', 'is_active']).where('id', '=', id).where(this.tenantPredicate(actor)).executeTakeFirst();
    if (!location) throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);

    const stocks = await this.db.selectFrom('product_location_stock').select((eb) => eb.fn.sum<number>('qty').as('total_qty')).where('location_id', '=', id).where(this.tenantPredicate(actor)).executeTakeFirst();
    if (Number(stocks?.total_qty || 0) > 0) throw new AppError('لا يمكن حذف المخزن طالما يوجد به رصيد. يجب تحويل الرصيد أولاً', 'LOCATION_HAS_STOCK', 400);

    // Clean up empty stock records first
    await this.db.deleteFrom('product_location_stock').where('location_id', '=', id).where('qty', '<=', 0).where(this.tenantPredicate(actor)).execute();

    try {
      // Clear movement history for this location to allow hard deletion
      await this.db.deleteFrom('stock_movements').where('location_id', '=', id).where(this.tenantPredicate(actor)).execute();

      // Try to hard delete
      await this.db.deleteFrom('stock_locations').where('id', '=', id).where(this.tenantPredicate(actor)).execute();
      await this.audit.log('حذف مخزن نهائي', `تم حذف المخزن #${id} نهائياً بواسطة ${actor.username}`, actor);
    } catch (error: any) {
      // If foreign key constraint fails (e.g. stock_movements), fallback to soft delete
      if (error.code === '23503') {
        if (location.is_active) {
          await this.db.updateTable('stock_locations').set({ is_active: false }).where('id', '=', id).where(this.tenantPredicate(actor)).execute();
          await this.audit.log('أرشفة مخزن', `تم أرشفة المخزن #${id} لوجود حركات سابقة بواسطة ${actor.username}`, actor);
        }
      } else {
        throw error;
      }
    }
    return { ok: true, removedLocationId: String(id), ...(await this.listLocations(actor)) };
  }
}
