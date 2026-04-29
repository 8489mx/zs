import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { applyStockDelta } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

type DbExecutor = Kysely<Database>;

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class SettingsImportService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  assertAdmin(auth?: AuthContext | null): asserts auth is AuthContext {
    if (!auth) throw new ForbiddenException('Authentication required');
    const canManage = auth.role === 'super_admin' || auth.permissions.includes('settings') || auth.permissions.includes('canManageSettings');
    if (!canManage) throw new ForbiddenException('Missing required permissions');
  }

  private async ensureCategory(db: DbExecutor, name: string): Promise<number | null> {
    const normalized = cleanString(name);
    if (!normalized) return null;
    const existing = await db.selectFrom('product_categories').select(['id']).where(sql`LOWER(name)`, '=', normalized.toLowerCase()).executeTakeFirst();
    if (existing) return Number(existing.id);
    const inserted = await db.insertInto('product_categories').values({ name: normalized, is_active: true }).returning('id').executeTakeFirstOrThrow();
    return Number(inserted.id);
  }

  private async ensureSupplier(db: DbExecutor, name: string): Promise<number | null> {
    const normalized = cleanString(name);
    if (!normalized) return null;
    const existing = await db.selectFrom('suppliers').select(['id']).where(sql`LOWER(name)`, '=', normalized.toLowerCase()).executeTakeFirst();
    if (existing) return Number(existing.id);
    const inserted = await db.insertInto('suppliers').values({ name: normalized, phone: '', address: '', balance: 0, notes: '', is_active: true }).returning('id').executeTakeFirstOrThrow();
    return Number(inserted.id);
  }

  private async addCustomerOpeningBalance(db: DbExecutor, customerId: number, amount: number, actor: AuthContext): Promise<void> {
    if (Math.abs(amount) <= 0.0001) return;
    await db.insertInto('customer_ledger').values({
      customer_id: customerId,
      entry_type: 'opening_balance',
      amount,
      balance_after: amount,
      note: 'رصيد أولي من الاستيراد',
      reference_type: 'customer',
      reference_id: customerId,
      created_by: actor.userId,
      branch_id: null,
      location_id: null,
    }).execute();
    await db.updateTable('customers').set({ balance: amount, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async addSupplierOpeningBalance(db: DbExecutor, supplierId: number, amount: number, actor: AuthContext): Promise<void> {
    if (Math.abs(amount) <= 0.0001) return;
    await db.insertInto('supplier_ledger').values({
      supplier_id: supplierId,
      entry_type: 'opening_balance',
      amount,
      balance_after: amount,
      note: 'رصيد أولي من الاستيراد',
      reference_type: 'supplier',
      reference_id: supplierId,
      created_by: actor.userId,
      branch_id: null,
      location_id: null,
    }).execute();
    await db.updateTable('suppliers').set({ balance: amount, updated_at: sql`NOW()` }).where('id', '=', supplierId).execute();
  }

  async importProducts(rows: unknown[], actor: AuthContext): Promise<Record<string, unknown>> {
    if (!Array.isArray(rows)) throw new AppError('rows must be an array', 'IMPORT_ROWS_INVALID', 400);
    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;
      let stockQtyIgnoredOnUpdate = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const name = cleanString(row.name);
        if (!name) continue;
        const categoryId = await this.ensureCategory(trx, cleanString(row.categoryName || row.category || ''));
        const supplierId = await this.ensureSupplier(trx, cleanString(row.supplierName || row.supplier || ''));
        const existing = await trx.selectFrom('products').select(['id']).where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        const payload = {
          name,
          barcode: cleanString(row.barcode) || null,
          category_id: categoryId,
          supplier_id: supplierId,
          cost_price: toNumber(row.costPrice || row.cost || 0),
          retail_price: toNumber(row.retailPrice || row.price || 0),
          wholesale_price: toNumber(row.wholesalePrice || row.retailPrice || row.price || 0),
          min_stock_qty: toNumber(row.minStockQty || row.minQty || 0),
          notes: cleanString(row.notes),
        };

        if (existing) {
          const requestedStockQty = toNumber(row.stockQty || 0);
          if (Math.abs(requestedStockQty) > 0.0001) {
            stockQtyIgnoredOnUpdate += 1;
          }

          await trx.updateTable('products').set({ ...payload, updated_at: sql`NOW()` }).where('id', '=', Number(existing.id)).execute();
          updated += 1;
        } else {
          const initialStockQty = toNumber(row.stockQty || 0);
          const insertedProduct = await trx.insertInto('products').values({ ...payload, stock_qty: initialStockQty, is_active: true }).returning('id').executeTakeFirstOrThrow();
          if (initialStockQty > 0) {
            await trx.insertInto('product_location_stock').values({ product_id: Number(insertedProduct.id), branch_id: null, location_id: null, qty: initialStockQty }).execute();
          }
          inserted += 1;
        }
      }

      return { inserted, updated, stockQtyIgnoredOnUpdate };
    });

    await this.audit.log('استيراد أصناف', `تم استيراد/تحديث ${result.inserted + result.updated} صنف على يد ${actor.username}`, actor);
    return { ok: true, inserted: result.inserted, updated: result.updated, warnings: result.stockQtyIgnoredOnUpdate > 0 ? [`تم إهمال stockQty لعدد ${result.stockQtyIgnoredOnUpdate} من الأصناف الموجودة مسبقًا. استخدم إدخال الرصيد الأولي أو تعديل المخزون بدلًا من هذا.`] : [] };
  }

  async importCustomers(rows: unknown[], actor: AuthContext): Promise<Record<string, unknown>> {
    if (!Array.isArray(rows)) throw new AppError('rows must be an array', 'IMPORT_ROWS_INVALID', 400);
    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const name = cleanString(row.name);
        if (!name) continue;
        const existing = await trx.selectFrom('customers').select(['id', 'balance']).where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        const openingBalance = toNumber(row.openingBalance || row.balance || 0);
        const storeCreditBalance = toNumber(row.storeCreditBalance || 0);
        const payload = {
          name,
          phone: cleanString(row.phone),
          address: cleanString(row.address),
          customer_type: cleanString(row.type).toLowerCase() === 'vip' ? 'vip' as const : 'cash' as const,
          credit_limit: toNumber(row.creditLimit || 0),
          company_name: cleanString(row.companyName),
          tax_number: cleanString(row.taxNumber),
        };

        if (existing) {
          await trx.updateTable('customers').set({ ...payload, store_credit_balance: storeCreditBalance, updated_at: sql`NOW()` }).where('id', '=', Number(existing.id)).execute();
          updated += 1;
        } else {
          const insertedRow = await trx.insertInto('customers').values({ ...payload, balance: 0, store_credit_balance: storeCreditBalance, is_active: true }).returning('id').executeTakeFirstOrThrow();
          await this.addCustomerOpeningBalance(trx, Number(insertedRow.id), openingBalance, actor);
          inserted += 1;
        }
      }

      return { inserted, updated };
    });

    await this.audit.log('استيراد عملاء', `تم استيراد/تحديث ${result.inserted + result.updated} عميل على يد ${actor.username}`, actor);
    return { ok: true, inserted: result.inserted, updated: result.updated };
  }

  async importSuppliers(rows: unknown[], actor: AuthContext): Promise<Record<string, unknown>> {
    if (!Array.isArray(rows)) throw new AppError('rows must be an array', 'IMPORT_ROWS_INVALID', 400);
    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const name = cleanString(row.name);
        if (!name) continue;
        const existing = await trx.selectFrom('suppliers').select(['id']).where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        const openingBalance = toNumber(row.openingBalance || row.balance || 0);
        const payload = {
          name,
          phone: cleanString(row.phone),
          address: cleanString(row.address),
          notes: cleanString(row.notes),
        };

        if (existing) {
          await trx.updateTable('suppliers').set({ ...payload, updated_at: sql`NOW()` }).where('id', '=', Number(existing.id)).execute();
          updated += 1;
        } else {
          const insertedRow = await trx.insertInto('suppliers').values({ ...payload, balance: 0, is_active: true }).returning('id').executeTakeFirstOrThrow();
          await this.addSupplierOpeningBalance(trx, Number(insertedRow.id), openingBalance, actor);
          inserted += 1;
        }
      }

      return { inserted, updated };
    });

    await this.audit.log('استيراد موردين', `تم استيراد/تحديث ${result.inserted + result.updated} مورد على يد ${actor.username}`, actor);
    return { ok: true, inserted: result.inserted, updated: result.updated };
  }

  async importOpeningStock(rows: unknown[], actor: AuthContext): Promise<Record<string, unknown>> {
    if (!Array.isArray(rows)) throw new AppError('rows must be an array', 'IMPORT_ROWS_INVALID', 400);
    const result = await this.db.transaction().execute(async (trx) => {
      let updated = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const productId = toNumber(row.productId || 0);
        const productName = cleanString(row.productName || row.name);
        const qty = toNumber(row.qty || row.quantity || 0);
        if (qty <= 0) continue;

        const product = productId > 0
          ? await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where('id', '=', productId).where('is_active', '=', true).executeTakeFirst()
          : await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where(sql`LOWER(name)`, '=', productName.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        if (!product) continue;

        const branchId = toNumber(row.branchId || row.branch || 0) || null;
        const locationId = toNumber(row.locationId || row.location || 0) || null;
        const stockChange = await applyStockDelta(trx, {
          productId: Number(product.id),
          delta: qty,
          branchId,
          locationId,
        });
        await trx.insertInto('stock_movements').values({
          product_id: Number(product.id),
          movement_type: 'opening_stock',
          qty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'opening_stock',
          note: 'رصيد أولي من الاستيراد',
          reference_type: 'product',
          reference_id: Number(product.id),
          created_by: actor.userId,
          branch_id: branchId,
          location_id: locationId,
        }).execute();
        updated += 1;
      }

      return { updated };
    });

    await this.audit.log('استيراد مخزون افتتاحي', `تم تحديث ${result.updated} سجل مخزون على يد ${actor.username}`, actor);
    return { ok: true, updated: result.updated };
  }
}
