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

  // --- Modifier Groups & Meal Combos Matrix (مجموعات الخيارات والإضافات) ---

  async listModifierGroups(auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const groups = await this.db
      .selectFrom('pos_modifier_groups as g')
      .selectAll()
      .where('g.tenant_id', '=', scope.tenantId)
      .orderBy('g.display_order', 'asc')
      .orderBy('g.id', 'asc')
      .execute();

    const groupIds = groups.map((g) => Number(g.id));
    let options: any[] = [];
    if (groupIds.length > 0) {
      options = await this.db
        .selectFrom('pos_modifier_options')
        .selectAll()
        .where('tenant_id', '=', scope.tenantId)
        .where('group_id', 'in', groupIds)
        .orderBy('display_order', 'asc')
        .orderBy('id', 'asc')
        .execute();
    }

    return {
      groups: groups.map((g) => ({
        id: Number(g.id),
        name: g.name,
        nameEn: g.name_en,
        selectionType: g.selection_type || 'multiple',
        isMandatory: Boolean(g.is_mandatory),
        minSelections: Number(g.min_selections || 0),
        maxSelections: Number(g.max_selections || 10),
        displayOrder: Number(g.display_order || 0),
        isActive: Boolean(g.is_active),
        options: options
          .filter((opt) => Number(opt.group_id) === Number(g.id))
          .map((opt) => ({
            id: Number(opt.id),
            groupId: Number(opt.group_id),
            name: opt.name,
            nameEn: opt.name_en,
            price: Number(opt.price || 0),
            costPrice: Number(opt.cost_price || 0),
            isDefault: Boolean(opt.is_default),
            isActive: Boolean(opt.is_active),
            displayOrder: Number(opt.display_order || 0),
          })),
      })),
    };
  }

  async createModifierGroup(payload: any, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const result = await this.db.transaction().execute(async (trx) => {
      const insertedGroup = await trx
        .insertInto('pos_modifier_groups')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          name: payload.name,
          name_en: payload.nameEn || null,
          selection_type: payload.selectionType || 'multiple',
          is_mandatory: Boolean(payload.isMandatory),
          min_selections: Number(payload.minSelections || 0),
          max_selections: Number(payload.maxSelections || 10),
          display_order: Number(payload.displayOrder || 0),
          is_active: payload.isActive !== false,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const groupId = Number(insertedGroup.id);

      if (payload.options && Array.isArray(payload.options) && payload.options.length > 0) {
        await trx
          .insertInto('pos_modifier_options')
          .values(
            payload.options.map((opt: any, idx: number) => ({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              group_id: groupId,
              name: opt.name,
              name_en: opt.nameEn || null,
              price: Number(opt.price || 0),
              cost_price: Number(opt.costPrice || 0),
              is_default: Boolean(opt.isDefault),
              is_active: opt.isActive !== false,
              display_order: opt.displayOrder !== undefined ? Number(opt.displayOrder) : idx,
            }))
          )
          .execute();
      }

      return { id: groupId };
    });

    await this.audit.log('إضافة مجموعة خيارات', `تم إنشاء مجموعة خيارات: ${payload.name}`, auth);
    return { ok: true, id: result.id };
  }

  async updateModifierGroup(id: number, payload: any, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('pos_modifier_groups')
        .set({
          name: payload.name,
          name_en: payload.nameEn || null,
          selection_type: payload.selectionType || 'multiple',
          is_mandatory: Boolean(payload.isMandatory),
          min_selections: Number(payload.minSelections || 0),
          max_selections: Number(payload.maxSelections || 10),
          display_order: Number(payload.displayOrder || 0),
          is_active: payload.isActive !== false,
          updated_at: (this.db as any).fn ? undefined : undefined,
        })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      if (payload.options && Array.isArray(payload.options)) {
        // Delete old options and re-insert
        await trx
          .deleteFrom('pos_modifier_options')
          .where('group_id', '=', id)
          .where('tenant_id', '=', scope.tenantId)
          .execute();

        if (payload.options.length > 0) {
          await trx
            .insertInto('pos_modifier_options')
            .values(
              payload.options.map((opt: any, idx: number) => ({
                tenant_id: scope.tenantId,
                account_id: scope.accountId,
                group_id: id,
                name: opt.name,
                name_en: opt.nameEn || null,
                price: Number(opt.price || 0),
                cost_price: Number(opt.costPrice || 0),
                is_default: Boolean(opt.isDefault),
                is_active: opt.isActive !== false,
                display_order: opt.displayOrder !== undefined ? Number(opt.displayOrder) : idx,
              }))
            )
            .execute();
        }
      }
    });

    await this.audit.log('تعديل مجموعة خيارات', `تم تحديث مجموعة الخيارات #${id}`, auth);
    return { ok: true };
  }

  async deleteModifierGroup(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('pos_modifier_options')
        .where('group_id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      await trx
        .deleteFrom('product_pos_modifiers')
        .where('modifier_group_id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      await trx
        .deleteFrom('pos_modifier_groups')
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    });

    await this.audit.log('حذف مجموعة خيارات', `تم حذف مجموعة الخيارات #${id}`, auth);
    return { ok: true };
  }

  async getProductModifiers(productId: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);

    // Check linked groups
    const linked = await this.db
      .selectFrom('product_pos_modifiers')
      .select(['modifier_group_id'])
      .where('product_id', '=', productId)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    let targetGroupIds = linked.map((l) => Number(l.modifier_group_id));

    let groupsQuery = this.db
      .selectFrom('pos_modifier_groups as g')
      .selectAll()
      .where('g.tenant_id', '=', scope.tenantId)
      .where('g.is_active', '=', true);

    if (targetGroupIds.length > 0) {
      groupsQuery = groupsQuery.where('g.id', 'in', targetGroupIds);
    }

    const groups = await groupsQuery.orderBy('g.display_order', 'asc').execute();
    const groupIds = groups.map((g) => Number(g.id));

    let options: any[] = [];
    if (groupIds.length > 0) {
      options = await this.db
        .selectFrom('pos_modifier_options')
        .selectAll()
        .where('tenant_id', '=', scope.tenantId)
        .where('group_id', 'in', groupIds)
        .where('is_active', '=', true)
        .orderBy('display_order', 'asc')
        .execute();
    }

    return {
      groups: groups.map((g) => ({
        id: Number(g.id),
        name: g.name,
        nameEn: g.name_en,
        selectionType: g.selection_type || 'multiple',
        isMandatory: Boolean(g.is_mandatory),
        minSelections: Number(g.min_selections || 0),
        maxSelections: Number(g.max_selections || 10),
        options: options
          .filter((opt) => Number(opt.group_id) === Number(g.id))
          .map((opt) => ({
            id: Number(opt.id),
            groupId: Number(opt.group_id),
            name: opt.name,
            nameEn: opt.name_en,
            price: Number(opt.price || 0),
            costPrice: Number(opt.cost_price || 0),
            isDefault: Boolean(opt.is_default),
          })),
      })),
    };
  }

  async linkProductModifiers(productId: number, groupIds: number[], auth: AuthContext) {
    const scope = requireTenantScope(auth);
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('product_pos_modifiers')
        .where('product_id', '=', productId)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      if (groupIds && groupIds.length > 0) {
        await trx
          .insertInto('product_pos_modifiers')
          .values(
            groupIds.map((gId) => ({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              product_id: productId,
              modifier_group_id: gId,
            }))
          )
          .execute();
      }
    });

    return { ok: true };
  }
}
