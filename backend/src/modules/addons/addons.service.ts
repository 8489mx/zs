import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { UpsertAddonDto } from './dto/upsert-addon.dto';

@Injectable()
export class AddonsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  async listAddons(auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const addons = await this.db
      .selectFrom('addons')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .orderBy('id', 'desc')
      .execute();

    return {
      addons: addons.map(a => ({
        id: String(a.id),
        name: a.name,
        price: Number(a.price),
        costPrice: Number(a.cost_price),
        isActive: a.is_active,
        createdAt: a.created_at,
      }))
    };
  }

  async createAddon(payload: UpsertAddonDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const result = await this.db
      .insertInto('addons')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        name: payload.name,
        price: payload.price,
        cost_price: payload.costPrice ?? 0,
        is_active: payload.isActive ?? true,
      })
      .returning('id')
      .executeTakeFirst();

    if (!result?.id) {
      throw new AppError('Failed to create addon', 'ADDON_CREATE_FAILED', 400);
    }

    await this.audit.log('إضافة ملحق', `تم إنشاء ملحق جديد: ${payload.name}`, auth);
    return { ok: true, id: String(result.id) };
  }

  async updateAddon(id: number, payload: UpsertAddonDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const result = await this.db
      .updateTable('addons')
      .set({
        name: payload.name,
        price: payload.price,
        cost_price: payload.costPrice ?? 0,
        is_active: payload.isActive ?? true,
      })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new AppError('الملحق غير موجود', 'ADDON_NOT_FOUND', 404);
    }

    await this.audit.log('تعديل ملحق', `تم تعديل بيانات الملحق #${id}`, auth);
    return { ok: true };
  }

  async deleteAddon(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const result = await this.db
      .deleteFrom('addons')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (Number(result.numDeletedRows) === 0) {
      throw new AppError('الملحق غير موجود', 'ADDON_NOT_FOUND', 404);
    }

    await this.audit.log('حذف ملحق', `تم حذف الملحق #${id}`, auth);
    return { ok: true };
  }
}
