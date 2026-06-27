import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { applyStockDelta } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

type DbExecutor = Kysely<Database>;
type TenantScope = { tenantId: string; accountId: string };

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeImportKey(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function normalizeArabicDigits(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeNumberText(value: unknown): string {
  return normalizeArabicDigits(value).replace(/[،,]/g, '.').trim();
}

function digitsOnly(value: unknown): string {
  return normalizeArabicDigits(value).replace(/\D/g, '');
}

function normalizePhoneText(value: unknown): string {
  return normalizeArabicDigits(value).replace(/\s+/g, '').trim();
}

function parseDateOnly(value: unknown): string | null {
  const text = normalizeArabicDigits(value).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const ymdSlash = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdSlash) {
    const month = Number(ymdSlash[2]);
    const day = Number(ymdSlash[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${ymdSlash[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const mdYSlash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdYSlash) {
    const month = Number(mdYSlash[1]);
    const day = Number(mdYSlash[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${mdYSlash[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function toNumericOrNull(value: unknown): number | null {
  const text = normalizeNumberText(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
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
    requireTenantScope(auth);
  }

  assertEmployeeImporter(auth?: AuthContext | null): asserts auth is AuthContext {
    if (!auth) throw new ForbiddenException('Authentication required');
    const canImportEmployees = auth.role === 'super_admin'
      || auth.permissions.includes('hrEmployees')
      || auth.permissions.includes('hr');
    if (!canImportEmployees) throw new ForbiddenException('Missing required permissions');
    requireTenantScope(auth);
  }

  private scope(actor: AuthContext): TenantScope {
    return requireTenantScope(actor);
  }

  private tenantFields(actor: AuthContext): Record<string, string> {
    const scope = this.scope(actor);
    return { tenant_id: scope.tenantId, account_id: scope.accountId };
  }

  private buildRowLookup(row: Record<string, unknown>): Record<string, string> {
    const lookup: Record<string, string> = {};
    for (const [key, value] of Object.entries(row || {})) {
      lookup[normalizeImportKey(key)] = String(value ?? '').trim();
    }
    return lookup;
  }

  private pickCell(lookup: Record<string, string>, aliases: string[]): string {
    for (const alias of aliases) {
      const value = lookup[normalizeImportKey(alias)];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return '';
  }

  private normalizeEmployeeStatus(value: unknown): 'active' | 'inactive' | 'deactivated' | 'terminated' {
    const normalized = cleanString(value).toLowerCase();
    if (['inactive', 'غير نشط'].includes(normalized)) return 'inactive';
    if (['deactivated', 'موقوف'].includes(normalized)) return 'deactivated';
    if (['terminated', 'منتهي الخدمة'].includes(normalized)) return 'terminated';
    return 'active';
  }

  private normalizeCompensationType(value: unknown): 'monthly' | 'hourly' {
    const normalized = cleanString(value).toLowerCase();
    if (['hourly', 'بالساعة', 'أجر بالساعة'].includes(normalized)) return 'hourly';
    return 'monthly';
  }

  private normalizeOvertimePolicy(value: unknown): 'review_only' | 'disabled' | 'auto_approved' {
    const normalized = cleanString(value).toLowerCase();
    if (['disabled', 'غير محتسب'].includes(normalized)) return 'disabled';
    if (['auto_approved', 'محتسب تلقائيًا'].includes(normalized)) return 'auto_approved';
    return 'review_only';
  }

  private normalizeTimeOnly(value: unknown): string | null {
    const text = normalizeArabicDigits(value).trim();
    if (!text) return null;
    const matched = text.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!matched) return null;
    const hour = Number(matched[1]);
    const minute = Number(matched[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private async ensureHrMasterName(db: DbExecutor, table: 'hr_departments' | 'hr_job_titles' | 'hr_positions', name: string, actor: AuthContext): Promise<number | null> {
    const normalized = cleanString(name);
    if (!normalized) return null;
    const scope = this.scope(actor);
    const existing = await sql<{ id: number }>`
      SELECT id
      FROM ${sql.table(table)}
      WHERE tenant_id = ${scope.tenantId}
        AND LOWER(name) = LOWER(${normalized})
      ORDER BY id DESC
      LIMIT 1
    `.execute(db);
    if (existing.rows[0]?.id) return Number(existing.rows[0].id);

    const inserted = await sql<{ id: number }>`
      INSERT INTO ${sql.table(table)} (name, code, description, is_active, created_by, updated_by, tenant_id, account_id)
      VALUES (${normalized}, '', '', TRUE, ${actor.userId}, ${actor.userId}, ${scope.tenantId}, ${scope.accountId})
      RETURNING id
    `.execute(db);
    return inserted.rows[0]?.id ? Number(inserted.rows[0].id) : null;
  }

  private async nextAvailableEmployeeNo(db: DbExecutor, actor: AuthContext): Promise<string> {
    const scope = this.scope(actor);
    const result = await sql<{ employee_no: string }>`
      SELECT employee_no
      FROM hr_employees
      WHERE tenant_id = ${scope.tenantId}
        AND employee_no ~ '^[0-9]+$'
      ORDER BY LENGTH(employee_no), employee_no
    `.execute(db);
    const used = new Set<number>();
    for (const row of result.rows) {
      const numeric = Number(row.employee_no);
      if (Number.isSafeInteger(numeric) && numeric > 0) used.add(numeric);
    }
    let next = 1;
    while (used.has(next)) next += 1;
    return String(next).padStart(3, '0');
  }

  private async upsertEmployeeContact(db: DbExecutor, employeeId: number, contactType: 'phone' | 'email', value: string, actor: AuthContext): Promise<void> {
    const normalizedValue = cleanString(value);
    if (!normalizedValue) return;
    const scope = this.scope(actor);
    const existing = await sql<{ id: number }>`
      SELECT id
      FROM hr_employee_contacts
      WHERE tenant_id = ${scope.tenantId}
        AND employee_id = ${employeeId}
        AND LOWER(contact_type) = LOWER(${contactType})
      ORDER BY is_primary DESC, id DESC
      LIMIT 1
    `.execute(db);
    if (existing.rows[0]?.id) {
      await sql`
        UPDATE hr_employee_contacts
        SET value = ${normalizedValue},
            label = ${contactType === 'phone' ? 'الموبايل' : 'البريد الإلكتروني'},
            is_primary = ${contactType === 'phone'},
            updated_by = ${actor.userId},
            updated_at = NOW()
        WHERE tenant_id = ${scope.tenantId}
          AND id = ${existing.rows[0].id}
      `.execute(db);
      return;
    }

    await sql`
      INSERT INTO hr_employee_contacts (employee_id, contact_type, value, label, is_primary, notes, created_by, updated_by, tenant_id, account_id)
      VALUES (${employeeId}, ${contactType}, ${normalizedValue}, ${contactType === 'phone' ? 'الموبايل' : 'البريد الإلكتروني'}, ${contactType === 'phone'}, '', ${actor.userId}, ${actor.userId}, ${scope.tenantId}, ${scope.accountId})
    `.execute(db);
  }

  private async findEmployeeByContact(db: DbExecutor, contactType: 'phone' | 'email', value: string, actor: AuthContext): Promise<number[]> {
    const normalized = cleanString(value);
    if (!normalized) return [];
    const scope = this.scope(actor);
    const rows = await sql<{ employee_id: number }>`
      SELECT DISTINCT c.employee_id
      FROM hr_employee_contacts c
      WHERE c.tenant_id = ${scope.tenantId}
        AND LOWER(c.contact_type) = LOWER(${contactType})
        AND LOWER(c.value) = LOWER(${normalized})
      LIMIT 3
    `.execute(db);
    return rows.rows.map((row) => Number(row.employee_id)).filter((id) => id > 0);
  }

  private async ensureCategory(db: DbExecutor, name: string, actor: AuthContext): Promise<number | null> {
    const normalized = cleanString(name);
    if (!normalized) return null;
    const scope = this.scope(actor);
    const existing = await db.selectFrom('product_categories').select(['id']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where(sql`LOWER(name)`, '=', normalized.toLowerCase()).executeTakeFirst();
    if (existing) return Number(existing.id);
    const inserted = await db.insertInto('product_categories').values({ name: normalized, is_active: true, ...this.tenantFields(actor) } as any).returning('id').executeTakeFirstOrThrow();
    return Number(inserted.id);
  }

  private async ensureSupplier(db: DbExecutor, name: string, actor: AuthContext): Promise<number | null> {
    const normalized = cleanString(name);
    if (!normalized) return null;
    const scope = this.scope(actor);
    const existing = await db.selectFrom('suppliers').select(['id']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where(sql`LOWER(name)`, '=', normalized.toLowerCase()).executeTakeFirst();
    if (existing) return Number(existing.id);
    const inserted = await db.insertInto('suppliers').values({ name: normalized, phone: '', address: '', balance: 0, notes: '', is_active: true, ...this.tenantFields(actor) } as any).returning('id').executeTakeFirstOrThrow();
    return Number(inserted.id);
  }

  private async addCustomerOpeningBalance(db: DbExecutor, customerId: number, amount: number, actor: AuthContext): Promise<void> {
    if (Math.abs(amount) <= 0.0001) return;
    const scope = this.scope(actor);
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
      ...this.tenantFields(actor),
    } as any).execute();
    await db.updateTable('customers').set({ balance: amount, updated_at: sql`NOW()` }).where('id', '=', customerId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
  }

  private async addSupplierOpeningBalance(db: DbExecutor, supplierId: number, amount: number, actor: AuthContext): Promise<void> {
    if (Math.abs(amount) <= 0.0001) return;
    const scope = this.scope(actor);
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
      ...this.tenantFields(actor),
    } as any).execute();
    await db.updateTable('suppliers').set({ balance: amount, updated_at: sql`NOW()` }).where('id', '=', supplierId).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
  }

  async importProducts(rows: unknown[], actor: AuthContext): Promise<Record<string, unknown>> {
    if (!Array.isArray(rows)) throw new AppError('rows must be an array', 'IMPORT_ROWS_INVALID', 400);
    const scope = this.scope(actor);
    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;
      let stockQtyIgnoredOnUpdate = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const name = cleanString(row.name);
        if (!name) continue;
        const categoryId = await this.ensureCategory(trx, cleanString(row.categoryName || row.category || ''), actor);
        const supplierId = await this.ensureSupplier(trx, cleanString(row.supplierName || row.supplier || ''), actor);
        const barcode = cleanString(row.barcode) || null;
        
        const rawType = cleanString(row.itemType || row.type || row['النوع'] || '').toLowerCase();
        const itemType = ((rawType.includes('خام') || rawType === 'raw_material') ? 'raw_material' : 'product') as 'raw_material' | 'product';

        const existing = barcode
          ? await trx.selectFrom('products').select(['id']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('barcode', '=', barcode).where('is_active', '=', true).executeTakeFirst()
          : await trx.selectFrom('products').select(['id']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        const payload = {
          name,
          barcode,
          category_id: categoryId,
          supplier_id: supplierId,
          item_type: itemType,
          cost_price: toNumber(row.costPrice || row.cost || row['التكلفة'] || 0),
          retail_price: toNumber(row.retailPrice || row.price || row['السعر'] || 0),
          wholesale_price: toNumber(row.wholesalePrice || row.retailPrice || row.price || row['السعر'] || 0),
          min_stock_qty: toNumber(row.minStockQty || row.minQty || row['الحد الأدنى'] || 0),
          notes: cleanString(row.notes),
        };

        if (existing) {
          const requestedStockQty = toNumber(row.stockQty || 0);
          if (Math.abs(requestedStockQty) > 0.0001) stockQtyIgnoredOnUpdate += 1;
          await trx.updateTable('products').set({ ...payload, updated_at: sql`NOW()` }).where('id', '=', Number(existing.id)).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
          updated += 1;
        } else {
          const initialStockQty = toNumber(row.stockQty || 0);
          const insertedProduct = await trx.insertInto('products').values({ ...payload, stock_qty: initialStockQty, is_active: true, ...this.tenantFields(actor) } as any).returning('id').executeTakeFirstOrThrow();
          if (initialStockQty > 0) {
            await trx.insertInto('product_location_stock').values({ product_id: Number(insertedProduct.id), branch_id: null, location_id: null, qty: initialStockQty, ...this.tenantFields(actor) } as any).execute();
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
    const scope = this.scope(actor);
    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const name = cleanString(row.name);
        if (!name) continue;
        const phone = cleanString(row.phone);
        const existing = phone
          ? await trx.selectFrom('customers').select(['id', 'balance']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('phone', '=', phone).where('is_active', '=', true).executeTakeFirst()
          : await trx.selectFrom('customers').select(['id', 'balance']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        const openingBalance = toNumber(row.openingBalance || row.balance || 0);
        const storeCreditBalance = toNumber(row.storeCreditBalance || 0);
        const payload = {
          name,
          phone,
          address: cleanString(row.address),
          customer_type: cleanString(row.type).toLowerCase() === 'vip' ? 'vip' as const : 'cash' as const,
          credit_limit: toNumber(row.creditLimit || 0),
          company_name: cleanString(row.companyName),
          tax_number: cleanString(row.taxNumber),
        };

        if (existing) {
          await trx.updateTable('customers').set({ ...payload, store_credit_balance: storeCreditBalance, updated_at: sql`NOW()` }).where('id', '=', Number(existing.id)).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
          updated += 1;
        } else {
          const insertedRow = await trx.insertInto('customers').values({ ...payload, balance: 0, store_credit_balance: storeCreditBalance, is_active: true, ...this.tenantFields(actor) } as any).returning('id').executeTakeFirstOrThrow();
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
    const scope = this.scope(actor);
    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const name = cleanString(row.name);
        if (!name) continue;
        const phone = cleanString(row.phone);
        const existing = phone
          ? await trx.selectFrom('suppliers').select(['id']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('phone', '=', phone).where('is_active', '=', true).executeTakeFirst()
          : await trx.selectFrom('suppliers').select(['id']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where(sql`LOWER(name)`, '=', name.toLowerCase()).where('is_active', '=', true).executeTakeFirst();
        const openingBalance = toNumber(row.openingBalance || row.balance || 0);
        const payload = { name, phone, address: cleanString(row.address), notes: cleanString(row.notes) };

        if (existing) {
          await trx.updateTable('suppliers').set({ ...payload, updated_at: sql`NOW()` }).where('id', '=', Number(existing.id)).where(sql<boolean>`tenant_id = ${scope.tenantId}`).execute();
          updated += 1;
        } else {
          const insertedRow = await trx.insertInto('suppliers').values({ ...payload, balance: 0, is_active: true, ...this.tenantFields(actor) } as any).returning('id').executeTakeFirstOrThrow();
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
    const scope = this.scope(actor);
    const result = await this.db.transaction().execute(async (trx) => {
      let updated = 0;

      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const productId = toNumber(row.productId || 0);
        const productName = cleanString(row.productName || row.name);
        const qty = toNumber(row.qty || row.quantity || 0);
        if (qty < 0) continue;

        const barcode = cleanString(row.barcode);

        let productQuery = trx.selectFrom('products').select(['id', 'name', 'stock_qty'])
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .where('is_active', '=', true);

        if (productId > 0) {
          productQuery = productQuery.where('id', '=', productId);
        } else if (barcode) {
          productQuery = productQuery.where('barcode', '=', barcode);
        } else {
          productQuery = productQuery.where(sql`LOWER(name)`, '=', productName.toLowerCase());
        }

        const product = await productQuery.executeTakeFirst();
        if (!product) continue;

        const currentStock = Number(product.stock_qty || 0);
        const delta = qty - currentStock;
        
        if (delta === 0) continue;

        const branchId = toNumber(row.branchId || row.branch || 0) || null;
        const locationId = toNumber(row.locationId || row.location || 0) || null;
        const stockChange = await applyStockDelta(trx, { productId: Number(product.id), delta: delta, branchId, locationId, tenantId: scope.tenantId, accountId: scope.accountId });
        await trx.insertInto('stock_movements').values({
          product_id: Number(product.id),
          movement_type: 'opening_stock',
          qty: Math.abs(delta),
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'inventory_adjustment',
          note: 'تسوية رصيد من الاستيراد',
          reference_type: 'product',
          reference_id: Number(product.id),
          created_by: actor.userId,
          branch_id: branchId,
          location_id: locationId,
          ...this.tenantFields(actor),
        } as any).execute();
        updated += 1;
      }

      return { updated };
    });

    await this.audit.log('استيراد مخزون افتتاحي', `تم تحديث ${result.updated} سجل مخزون على يد ${actor.username}`, actor);
    return { ok: true, updated: result.updated };
  }

  async importEmployees(rows: unknown[], actor: AuthContext): Promise<Record<string, unknown>> {
    if (!Array.isArray(rows)) throw new AppError('rows must be an array', 'IMPORT_ROWS_INVALID', 400);
    const scope = this.scope(actor);

    const result = await this.db.transaction().execute(async (trx) => {
      let inserted = 0;
      let updated = 0;
      const warnings: string[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const rowNumber = index + 2;
        const raw = rows[index];
        const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const lookup = this.buildRowLookup(row);

        const fullName = this.pickCell(lookup, ['اسم الموظف', 'اسم العامل', 'الموظف', 'الاسم', 'employee name', 'employee_name', 'employeename', 'full name', 'fullname', 'full_name', 'name', 'displayname', 'display_name']);
        const explicitFirstName = this.pickCell(lookup, ['الاسم الأول', 'first name', 'firstname', 'first_name']);
        const explicitLastName = this.pickCell(lookup, ['الاسم الأخير', 'last name', 'lastname', 'last_name']);
        const nameParts = cleanString(fullName).split(/\s+/).filter(Boolean);
        const firstName = cleanString(explicitFirstName || nameParts[0] || '');
        const lastName = cleanString(explicitLastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''));
        const displayName = cleanString(`${firstName} ${lastName}`);

        if (!firstName) { warnings.push(`الصف ${rowNumber}: اسم الموظف مطلوب.`); continue; }

        const employeeNoRaw = normalizeArabicDigits(this.pickCell(lookup, ['كود الموظف', 'رقم الموظف', 'employee no', 'employee_no', 'employee code', 'code']));
        const employeeNoDigits = digitsOnly(employeeNoRaw);
        if (employeeNoRaw && !employeeNoDigits) { warnings.push(`الصف ${rowNumber}: كود الموظف يجب أن يحتوي أرقامًا فقط.`); continue; }
        const employeeNo = employeeNoDigits ? employeeNoDigits.padStart(3, '0') : '';

        const nationalIdText = digitsOnly(this.pickCell(lookup, ['الرقم القومي', 'رقم قومي', 'رقم الهوية', 'national id', 'national_id', 'nationalid', 'id number']));
        if (nationalIdText && nationalIdText.length !== 14) { warnings.push(`الصف ${rowNumber}: الرقم القومي يجب أن يكون 14 رقمًا.`); continue; }

        const hireDateRaw = this.pickCell(lookup, ['تاريخ التعيين', 'hire date', 'hiredate', 'hire_date']);
        const hireDate = hireDateRaw ? parseDateOnly(hireDateRaw) : null;
        if (hireDateRaw && !hireDate) { warnings.push(`الصف ${rowNumber}: تاريخ التعيين غير صحيح.`); continue; }

        const compensationType = this.normalizeCompensationType(this.pickCell(lookup, ['نوع الأجر', 'compensation type', 'compensation_type']));
        const hourlyRateText = this.pickCell(lookup, ['أجر الساعة', 'hourly rate', 'hourly_rate']);
        const expectedDailyHoursText = this.pickCell(lookup, ['ساعات العمل اليومية', 'ساعات العمل اليومية المتوقعة', 'expected daily hours', 'expected_daily_hours']);
        const graceMinutesText = this.pickCell(lookup, ['فترة السماح', 'فترة السماح بالدقائق', 'grace minutes', 'grace_minutes']);
        const hourlyRate = toNumericOrNull(hourlyRateText);
        const expectedDailyHours = toNumericOrNull(expectedDailyHoursText);
        const graceMinutes = toNumericOrNull(graceMinutesText);
        if (hourlyRateText && hourlyRate == null) { warnings.push(`الصف ${rowNumber}: أجر الساعة غير صالح.`); continue; }
        if (expectedDailyHoursText && expectedDailyHours == null) { warnings.push(`الصف ${rowNumber}: ساعات العمل اليومية غير صالحة.`); continue; }
        if (graceMinutesText && graceMinutes == null) { warnings.push(`الصف ${rowNumber}: فترة السماح غير صالحة.`); continue; }

        const scheduledCheckInRaw = this.pickCell(lookup, ['موعد الحضور', 'scheduled check in', 'scheduled_check_in_time', 'check in']);
        const scheduledCheckOutRaw = this.pickCell(lookup, ['موعد الانصراف', 'scheduled check out', 'scheduled_check_out_time', 'check out']);
        const scheduledCheckInTime = this.normalizeTimeOnly(scheduledCheckInRaw);
        const scheduledCheckOutTime = this.normalizeTimeOnly(scheduledCheckOutRaw);
        if (scheduledCheckInRaw && !scheduledCheckInTime) { warnings.push(`الصف ${rowNumber}: موعد الحضور غير صحيح.`); continue; }
        if (scheduledCheckOutRaw && !scheduledCheckOutTime) { warnings.push(`الصف ${rowNumber}: موعد الانصراف غير صحيح.`); continue; }

        const status = this.normalizeEmployeeStatus(this.pickCell(lookup, ['الحالة', 'status']));
        const overtimePolicy = this.normalizeOvertimePolicy(this.pickCell(lookup, ['سياسة الإضافي', 'overtime policy', 'overtime_policy']));
        const phone = normalizePhoneText(this.pickCell(lookup, ['رقم الهاتف', 'الموبايل', 'mobile', 'phoneNumber', 'phone number', 'phonenumber', 'phone']));
        const email = cleanString(this.pickCell(lookup, ['البريد الإلكتروني', 'email'])).toLowerCase();
        const notes = cleanString(this.pickCell(lookup, ['ملاحظات', 'notes']));

        const departmentId = await this.ensureHrMasterName(trx, 'hr_departments', this.pickCell(lookup, ['القسم', 'الإدارة', 'department']), actor);
        const jobTitleId = await this.ensureHrMasterName(trx, 'hr_job_titles', this.pickCell(lookup, ['الوظيفة', 'المسمى الوظيفي', 'job title', 'job_title', 'jobtitle']), actor);
        const positionId = await this.ensureHrMasterName(trx, 'hr_positions', this.pickCell(lookup, ['المنصب', 'position']), actor);

        const matchedIds = new Set<number>();
        if (employeeNo) {
          const byCode = await sql<{ id: number }>`SELECT id FROM hr_employees WHERE tenant_id = ${scope.tenantId} AND employee_no = ${employeeNo} LIMIT 2`.execute(trx);
          for (const rowMatch of byCode.rows) matchedIds.add(Number(rowMatch.id));
        } else {
          if (nationalIdText) {
            const byNational = await sql<{ id: number }>`SELECT id FROM hr_employees WHERE tenant_id = ${scope.tenantId} AND national_id = ${nationalIdText} LIMIT 2`.execute(trx);
            for (const rowMatch of byNational.rows) matchedIds.add(Number(rowMatch.id));
          }
          if (phone) for (const id of await this.findEmployeeByContact(trx, 'phone', phone, actor)) matchedIds.add(id);
          if (email) for (const id of await this.findEmployeeByContact(trx, 'email', email, actor)) matchedIds.add(id);
          if (!matchedIds.size && displayName) {
            const byName = await sql<{ id: number }>`SELECT id FROM hr_employees WHERE tenant_id = ${scope.tenantId} AND LOWER(display_name) = LOWER(${displayName}) LIMIT 2`.execute(trx);
            for (const rowMatch of byName.rows) matchedIds.add(Number(rowMatch.id));
          }
        }

        if (matchedIds.size > 1) { warnings.push(`الصف ${rowNumber}: تعذر تحديد موظف واحد بسبب تكرار محتمل. استخدم كود موظف واضح.`); continue; }

        const existingId = matchedIds.size === 1 ? Array.from(matchedIds)[0] : null;
        if (existingId) {
          await sql`
            UPDATE hr_employees
            SET employee_no = COALESCE(NULLIF(${employeeNo}, ''), employee_no),
                first_name = ${firstName}, last_name = ${lastName}, display_name = ${displayName}, national_id = ${nationalIdText || null}, status = ${status},
                department_id = ${departmentId}, job_title_id = ${jobTitleId}, position_id = ${positionId}, hire_date = ${hireDate}, compensation_type = ${compensationType},
                hourly_rate = ${compensationType === 'hourly' ? Number(hourlyRate || 0) : null}, expected_daily_hours = ${compensationType === 'hourly' ? Number(expectedDailyHours || 0) : null},
                scheduled_check_in_time = ${scheduledCheckInTime || null}, scheduled_check_out_time = ${scheduledCheckOutTime || null}, grace_minutes = ${Math.max(0, Math.floor(Number(graceMinutes || 0)))},
                overtime_policy = ${overtimePolicy}, notes = ${notes}, updated_by = ${actor.userId}, updated_at = NOW()
            WHERE tenant_id = ${scope.tenantId} AND id = ${existingId}
          `.execute(trx);
          if (phone) await this.upsertEmployeeContact(trx, existingId, 'phone', phone, actor);
          if (email) await this.upsertEmployeeContact(trx, existingId, 'email', email, actor);
          updated += 1;
          continue;
        }

        const generatedEmployeeNo = employeeNo || await this.nextAvailableEmployeeNo(trx, actor);
        const insertedEmployee = await sql<{ id: number }>`
          INSERT INTO hr_employees (employee_no, national_id, first_name, last_name, display_name, status, department_id, job_title_id, position_id, hire_date, notes, compensation_type, hourly_rate, expected_daily_hours, scheduled_check_in_time, scheduled_check_out_time, grace_minutes, overtime_policy, created_by, updated_by, tenant_id, account_id)
          VALUES (${generatedEmployeeNo}, ${nationalIdText || null}, ${firstName}, ${lastName}, ${displayName}, ${status}, ${departmentId}, ${jobTitleId}, ${positionId}, ${hireDate}, ${notes}, ${compensationType}, ${compensationType === 'hourly' ? Number(hourlyRate || 0) : null}, ${compensationType === 'hourly' ? Number(expectedDailyHours || 0) : null}, ${scheduledCheckInTime || null}, ${scheduledCheckOutTime || null}, ${Math.max(0, Math.floor(Number(graceMinutes || 0)))}, ${overtimePolicy}, ${actor.userId}, ${actor.userId}, ${scope.tenantId}, ${scope.accountId})
          RETURNING id
        `.execute(trx);
        const employeeId = Number(insertedEmployee.rows[0]?.id || 0);
        if (employeeId <= 0) { warnings.push(`الصف ${rowNumber}: تعذر حفظ الموظف.`); continue; }
        if (phone) await this.upsertEmployeeContact(trx, employeeId, 'phone', phone, actor);
        if (email) await this.upsertEmployeeContact(trx, employeeId, 'email', email, actor);
        inserted += 1;
      }

      return { inserted, updated, warnings };
    });

    await this.audit.log('استيراد موظفين', `تم استيراد/تحديث ${result.inserted + result.updated} موظف على يد ${actor.username}`, actor);
    return { ok: true, inserted: result.inserted, updated: result.updated, warnings: result.warnings };
  }
}
