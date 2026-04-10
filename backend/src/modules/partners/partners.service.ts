import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { UpsertCustomerDto } from './dto/upsert-customer.dto';
import { UpsertSupplierDto } from './dto/upsert-supplier.dto';
import { buildCustomerSearchPredicate, buildSupplierSearchPredicate, calculatePagination, mapCustomerRow, mapSupplierRow, parsePartnersListQuery } from './helpers/partners-listing.helper';

@Injectable()
export class PartnersService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  private async customerNameExists(name: string, excludeId?: number): Promise<boolean> {
    const row = await this.db
      .selectFrom('customers')
      .select(['id'])
      .where('is_active', '=', true)
      .where(sql`LOWER(name)`, '=', name.toLowerCase())
      .executeTakeFirst();

    return Boolean(row && (!excludeId || Number(row.id) !== excludeId));
  }

  private async supplierNameExists(name: string, excludeId?: number): Promise<boolean> {
    const row = await this.db
      .selectFrom('suppliers')
      .select(['id'])
      .where('is_active', '=', true)
      .where(sql`LOWER(name)`, '=', name.toLowerCase())
      .executeTakeFirst();

    return Boolean(row && (!excludeId || Number(row.id) !== excludeId));
  }

  private async addCustomerOpeningBalance(customerId: number, amount: number, actor: AuthContext): Promise<void> {
    const openingBalance = Number(Number(amount || 0).toFixed(2));
    if (Math.abs(openingBalance) <= 0.0001) return;

    await this.db.insertInto('customer_ledger').values({
      customer_id: customerId,
      entry_type: 'opening_balance',
      amount: openingBalance,
      balance_after: openingBalance,
      note: 'رصيد افتتاحي',
      reference_type: 'customer',
      reference_id: customerId,
      created_by: actor.userId,
      branch_id: null,
      location_id: null,
    }).execute();

    await this.db.updateTable('customers').set({ balance: openingBalance, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async addSupplierOpeningBalance(supplierId: number, amount: number, actor: AuthContext): Promise<void> {
    const openingBalance = Number(Number(amount || 0).toFixed(2));
    if (Math.abs(openingBalance) <= 0.0001) return;

    await this.db.insertInto('supplier_ledger').values({
      supplier_id: supplierId,
      entry_type: 'opening_balance',
      amount: openingBalance,
      balance_after: openingBalance,
      note: 'رصيد افتتاحي',
      reference_type: 'supplier',
      reference_id: supplierId,
      created_by: actor.userId,
      branch_id: null,
      location_id: null,
    }).execute();

    await this.db.updateTable('suppliers').set({ balance: openingBalance, updated_at: sql`NOW()` }).where('id', '=', supplierId).execute();
  }

  async listCustomers(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { page, pageSize, q, filter, isUnpagedDefault } = parsePartnersListQuery(query);

    let listQuery = this.db.selectFrom('customers').selectAll().where('is_active', '=', true);
    let countQuery = this.db.selectFrom('customers').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true);
    let summaryQuery = this.db.selectFrom('customers').select((eb) => [
      eb.fn.countAll<number>().as('total_customers'),
      sql<number>`coalesce(sum(balance), 0)`.as('total_balance'),
      sql<number>`coalesce(sum(credit_limit), 0)`.as('total_credit'),
      sql<number>`coalesce(sum(case when customer_type = 'vip' then 1 else 0 end), 0)`.as('vip_count'),
    ]).where('is_active', '=', true);

    const searchPredicate = buildCustomerSearchPredicate(q);
    if (searchPredicate) {
      listQuery = listQuery.where(searchPredicate);
      countQuery = countQuery.where(searchPredicate);
      summaryQuery = summaryQuery.where(searchPredicate);
    }

    if (filter === 'debt') {
      listQuery = listQuery.where('balance', '>', 0);
      countQuery = countQuery.where('balance', '>', 0);
      summaryQuery = summaryQuery.where('balance', '>', 0);
    } else if (filter === 'vip') {
      listQuery = listQuery.where('customer_type', '=', 'vip');
      countQuery = countQuery.where('customer_type', '=', 'vip');
      summaryQuery = summaryQuery.where('customer_type', '=', 'vip');
    } else if (filter === 'cash') {
      listQuery = listQuery.where('customer_type', '=', 'cash');
      countQuery = countQuery.where('customer_type', '=', 'cash');
      summaryQuery = summaryQuery.where('customer_type', '=', 'cash');
    }

    if (isUnpagedDefault) {
      const rows = await listQuery.orderBy('id asc').execute();
      return { customers: rows.map((row) => mapCustomerRow(row)) };
    }

    const [rows, countRow, summaryRow] = await Promise.all([
      listQuery.orderBy('id asc').limit(pageSize).offset((page - 1) * pageSize).execute(),
      countQuery.executeTakeFirstOrThrow(),
      summaryQuery.executeTakeFirstOrThrow(),
    ]);

    const totalItems = Number(countRow.count || 0);

    return {
      customers: rows.map((row) => mapCustomerRow(row)),
      pagination: calculatePagination(page, pageSize, totalItems),
      summary: {
        totalCustomers: Number(summaryRow.total_customers || 0),
        totalBalance: Number(summaryRow.total_balance || 0),
        totalCredit: Number(summaryRow.total_credit || 0),
        vipCount: Number(summaryRow.vip_count || 0),
      },
    };
  }

  async createCustomer(payload: UpsertCustomerDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Customer name is required', 'CUSTOMER_NAME_REQUIRED', 400);
    if (await this.customerNameExists(name)) throw new AppError('Customer already exists', 'CUSTOMER_EXISTS', 400);

    const inserted = await this.db
      .insertInto('customers')
      .values({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        balance: 0,
        customer_type: payload.type === 'vip' ? 'vip' : 'cash',
        credit_limit: Number(payload.creditLimit || 0),
        store_credit_balance: Number(payload.storeCreditBalance || 0),
        company_name: String(payload.companyName || '').trim(),
        tax_number: String(payload.taxNumber || '').trim(),
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await this.addCustomerOpeningBalance(Number(inserted.id), Number(payload.balance || 0), actor);
    await this.audit.log('إضافة عميل', `تم إضافة العميل ${name} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listCustomers({});
    return { ok: true, customers: listing.customers };
  }

  async updateCustomer(id: number, payload: UpsertCustomerDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db
      .selectFrom('customers')
      .select(['id', 'balance', 'store_credit_balance'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!existing) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);

    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Customer name is required', 'CUSTOMER_NAME_REQUIRED', 400);
    if (await this.customerNameExists(name, id)) throw new AppError('Customer already exists', 'CUSTOMER_EXISTS', 400);

    const requestedBalance = Number(payload.balance ?? existing.balance ?? 0);
    if (Math.abs(Number(existing.balance || 0) - requestedBalance) > 0.0001) {
      throw new AppError('Balance cannot be edited from customer form; use opening balance/import/reconcile flow', 'CUSTOMER_BALANCE_EDIT_FORBIDDEN', 400);
    }

    const requestedStoreCredit = Number(payload.storeCreditBalance ?? existing.store_credit_balance ?? 0);
    if (Math.abs(Number(existing.store_credit_balance || 0) - requestedStoreCredit) > 0.0001) {
      throw new AppError('Store credit cannot be edited from customer form', 'CUSTOMER_CREDIT_EDIT_FORBIDDEN', 400);
    }

    await this.db
      .updateTable('customers')
      .set({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        customer_type: payload.type === 'vip' ? 'vip' : 'cash',
        credit_limit: Number(payload.creditLimit || 0),
        company_name: String(payload.companyName || '').trim(),
        tax_number: String(payload.taxNumber || '').trim(),
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('تعديل عميل', `تم تحديث العميل #${id} بواسطة ${actor.username}`, actor.userId);
    const listing = await this.listCustomers({});
    return { ok: true, customers: listing.customers };
  }

  async deleteCustomer(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const customer = await this.db
      .selectFrom('customers')
      .select(['id', 'balance', 'store_credit_balance'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    if (Math.abs(Number(customer.balance || 0)) > 0.0001) throw new AppError('Customer has outstanding balance', 'CUSTOMER_HAS_BALANCE', 400);
    if (Math.abs(Number(customer.store_credit_balance || 0)) > 0.0001) throw new AppError('Customer has store credit balance', 'CUSTOMER_HAS_CREDIT', 400);

    const [salesCount, paymentCount, ledgerCount] = await Promise.all([
      this.db.selectFrom('sales').select((eb) => eb.fn.countAll<number>().as('count')).where('customer_id', '=', id).executeTakeFirstOrThrow(),
      this.db.selectFrom('customer_payments').select((eb) => eb.fn.countAll<number>().as('count')).where('customer_id', '=', id).executeTakeFirstOrThrow(),
      this.db.selectFrom('customer_ledger').select((eb) => eb.fn.countAll<number>().as('count')).where('customer_id', '=', id).executeTakeFirstOrThrow(),
    ]);

    if (Number(salesCount.count || 0) || Number(paymentCount.count || 0) || Number(ledgerCount.count || 0)) {
      throw new AppError('Customer has financial history and cannot be deleted', 'CUSTOMER_HAS_HISTORY', 400);
    }

    await this.db.deleteFrom('product_customer_prices').where('customer_id', '=', id).execute();
    await this.db.updateTable('customers').set({ is_active: false, updated_at: sql`NOW()` }).where('id', '=', id).execute();
    await this.audit.log('حذف عميل', `تم تعطيل العميل #${id} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listCustomers({});
    return { ok: true, customers: listing.customers };
  }

  async listSuppliers(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { page, pageSize, q, filter, isUnpagedDefault } = parsePartnersListQuery(query);

    let listQuery = this.db.selectFrom('suppliers').selectAll().where('is_active', '=', true);
    let countQuery = this.db.selectFrom('suppliers').select((eb) => eb.fn.countAll<number>().as('count')).where('is_active', '=', true);
    let summaryQuery = this.db.selectFrom('suppliers').select((eb) => [
      eb.fn.countAll<number>().as('total_suppliers'),
      sql<number>`coalesce(sum(balance), 0)`.as('total_balance'),
      sql<number>`coalesce(sum(case when trim(notes) <> '' then 1 else 0 end), 0)`.as('with_notes'),
    ]).where('is_active', '=', true);

    const searchPredicate = buildSupplierSearchPredicate(q);
    if (searchPredicate) {
      listQuery = listQuery.where(searchPredicate);
      countQuery = countQuery.where(searchPredicate);
      summaryQuery = summaryQuery.where(searchPredicate);
    }

    if (filter === 'balance' || filter === 'debt') {
      listQuery = listQuery.where('balance', '>', 0);
      countQuery = countQuery.where('balance', '>', 0);
      summaryQuery = summaryQuery.where('balance', '>', 0);
    } else if (filter === 'withNotes') {
      const notesPredicate = sql<boolean>`trim(notes) <> ''`;
      listQuery = listQuery.where(notesPredicate);
      countQuery = countQuery.where(notesPredicate);
      summaryQuery = summaryQuery.where(notesPredicate);
    }

    if (isUnpagedDefault) {
      const rows = await listQuery.orderBy('id asc').execute();
      return { suppliers: rows.map((row) => mapSupplierRow(row)) };
    }

    const [rows, countRow, summaryRow] = await Promise.all([
      listQuery.orderBy('id asc').limit(pageSize).offset((page - 1) * pageSize).execute(),
      countQuery.executeTakeFirstOrThrow(),
      summaryQuery.executeTakeFirstOrThrow(),
    ]);

    const totalItems = Number(countRow.count || 0);

    return {
      suppliers: rows.map((row) => mapSupplierRow(row)),
      pagination: calculatePagination(page, pageSize, totalItems),
      summary: {
        totalSuppliers: Number(summaryRow.total_suppliers || 0),
        totalBalance: Number(summaryRow.total_balance || 0),
        withNotes: Number(summaryRow.with_notes || 0),
      },
    };
  }

  async createSupplier(payload: UpsertSupplierDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Supplier name is required', 'SUPPLIER_NAME_REQUIRED', 400);
    if (await this.supplierNameExists(name)) throw new AppError('Supplier already exists', 'SUPPLIER_EXISTS', 400);

    const inserted = await this.db
      .insertInto('suppliers')
      .values({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        balance: 0,
        notes: String(payload.notes || '').trim(),
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await this.addSupplierOpeningBalance(Number(inserted.id), Number(payload.balance || 0), actor);
    await this.audit.log('إضافة مورد', `تم إضافة المورد ${name} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listSuppliers({});
    return { ok: true, suppliers: listing.suppliers };
  }

  async updateSupplier(id: number, payload: UpsertSupplierDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db
      .selectFrom('suppliers')
      .select(['id', 'balance'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!existing) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Supplier name is required', 'SUPPLIER_NAME_REQUIRED', 400);
    if (await this.supplierNameExists(name, id)) throw new AppError('Supplier already exists', 'SUPPLIER_EXISTS', 400);

    const requestedBalance = Number(payload.balance ?? existing.balance ?? 0);
    if (Math.abs(Number(existing.balance || 0) - requestedBalance) > 0.0001) {
      throw new AppError('Balance cannot be edited from supplier form; use opening balance/import/reconcile flow', 'SUPPLIER_BALANCE_EDIT_FORBIDDEN', 400);
    }

    await this.db
      .updateTable('suppliers')
      .set({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        notes: String(payload.notes || '').trim(),
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('تعديل مورد', `تم تحديث المورد #${id} بواسطة ${actor.username}`, actor.userId);
    const listing = await this.listSuppliers({});
    return { ok: true, suppliers: listing.suppliers };
  }

  async deleteSupplier(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const supplier = await this.db
      .selectFrom('suppliers')
      .select(['id', 'balance'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    if (Math.abs(Number(supplier.balance || 0)) > 0.0001) throw new AppError('Supplier has outstanding balance', 'SUPPLIER_HAS_BALANCE', 400);

    const [purchaseCount, paymentCount, ledgerCount] = await Promise.all([
      this.db.selectFrom('purchases').select((eb) => eb.fn.countAll<number>().as('count')).where('supplier_id', '=', id).executeTakeFirstOrThrow(),
      this.db.selectFrom('supplier_payments').select((eb) => eb.fn.countAll<number>().as('count')).where('supplier_id', '=', id).executeTakeFirstOrThrow(),
      this.db.selectFrom('supplier_ledger').select((eb) => eb.fn.countAll<number>().as('count')).where('supplier_id', '=', id).executeTakeFirstOrThrow(),
    ]);

    if (Number(purchaseCount.count || 0) || Number(paymentCount.count || 0) || Number(ledgerCount.count || 0)) {
      throw new AppError('Supplier has financial history and cannot be deleted', 'SUPPLIER_HAS_HISTORY', 400);
    }

    await this.db.updateTable('suppliers').set({ is_active: false, updated_at: sql`NOW()` }).where('id', '=', id).execute();
    await this.audit.log('حذف مورد', `تم تعطيل المورد #${id} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listSuppliers({});
    return { ok: true, suppliers: listing.suppliers };
  }
}
