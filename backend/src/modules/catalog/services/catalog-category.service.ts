import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { UpsertCategoryDto } from '../dto/upsert-category.dto';

@Injectable()
export class CatalogCategoryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>, private readonly audit: AuditService) {}

  async listCategories(): Promise<Record<string, unknown>> {
    const categories = await this.db.selectFrom('product_categories').select(['id', 'name']).where('is_active', '=', true).orderBy('id asc').execute();
    return { categories: categories.map((entry) => ({ id: String(entry.id), name: entry.name })) };
  }

  async createCategory(payload: UpsertCategoryDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Category name is required', 'CATEGORY_NAME_REQUIRED', 400);
    const duplicate = await this.db.selectFrom('product_categories').select('id').where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
    if (duplicate) throw new AppError('Category already exists', 'CATEGORY_EXISTS', 400);
    await this.db.insertInto('product_categories').values({ name, is_active: true }).execute();
    await this.audit.log('إضافة تصنيف', `تم إضافة تصنيف ${name} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, ...(await this.listCategories()) };
  }

  async updateCategory(id: number, payload: UpsertCategoryDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Category name is required', 'CATEGORY_NAME_REQUIRED', 400);
    const existing = await this.db.selectFrom('product_categories').select(['id']).where('id', '=', id).where('is_active', '=', true).executeTakeFirst();
    if (!existing) throw new AppError('Category not found', 'CATEGORY_NOT_FOUND', 404);
    const duplicate = await this.db.selectFrom('product_categories').select('id').where(sql`LOWER(name)`, '=', name.toLowerCase()).where('id', '!=', id).where('is_active', '=', true).executeTakeFirst();
    if (duplicate) throw new AppError('Category already exists', 'CATEGORY_EXISTS', 400);
    await this.db.updateTable('product_categories').set({ name, updated_at: sql`NOW()` }).where('id', '=', id).execute();
    await this.audit.log('تعديل تصنيف', `تم تحديث تصنيف #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, ...(await this.listCategories()) };
  }

  async deleteCategory(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const inUse = await this.db.selectFrom('products').select((eb) => eb.fn.countAll<number>().as('count')).where('category_id', '=', id).where('is_active', '=', true).executeTakeFirstOrThrow();
    if (Number(inUse.count || 0) > 0) throw new AppError('Category is used by products', 'CATEGORY_IN_USE', 400);
    await this.db.updateTable('product_categories').set({ is_active: false, updated_at: sql`NOW()` }).where('id', '=', id).execute();
    await this.audit.log('حذف تصنيف', `تم حذف تصنيف #${id} بواسطة ${actor.username}`, actor.userId);
    return { ok: true, ...(await this.listCategories()) };
  }
}
