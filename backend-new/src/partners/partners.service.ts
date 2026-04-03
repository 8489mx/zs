import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Selectable, sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { CustomerTable, Database, SupplierTable } from '../database/database.types';
import { UpsertCustomerDto } from './dto/upsert-customer.dto';
import { UpsertSupplierDto } from './dto/upsert-supplier.dto';

type CustomerRow = Selectable<CustomerTable>;
type SupplierRow = Selectable<SupplierTable>;

@Injectable()
export class PartnersService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  private mapCustomer(row: CustomerRow): Record<string, unknown> {
    return {
      id: String(row.id),
      name: row.name || '',
      phone: row.phone || '',
      address: row.address || '',
      balance: Number(row.balance || 0),
      type: row.customer_type || 'cash',
      creditLimit: Number(row.credit_limit || 0),
      storeCreditBalance: Number(row.store_credit_balance || 0),
      companyName: row.company_name || '',
      taxNumber: row.tax_number || '',
    };
  }

  private mapSupplier(row: SupplierRow): Record<string, unknown> {
    return {
      id: String(row.id),
      name: row.name || '',
      phone: row.phone || '',
      address: row.address || '',
      balance: Number(row.balance || 0),
      notes: row.notes || '',
    };
  }

  private async customerNameExists(name: string, excludeId?: number): Promise<boolean> {
    const rows = await this.db
      .selectFrom('customers')
      .select(['id', 'name'])
      .where('is_active', '=', true)
      .execute();

    const normalized = name.toLowerCase();
    return rows.some((row) => row.name.toLowerCase() === normalized && (!excludeId || row.id !== excludeId));
  }

  private async supplierNameExists(name: string, excludeId?: number): Promise<boolean> {
    const rows = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name'])
      .where('is_active', '=', true)
      .execute();

    const normalized = name.toLowerCase();
    return rows.some((row) => row.name.toLowerCase() === normalized && (!excludeId || row.id !== excludeId));
  }

  async listCustomers(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(5, Number(query.pageSize || 20)));
    const q = String(query.q || '').trim().toLowerCase();
    const filter = String(query.filter || 'all');

    const rows = await this.db
      .selectFrom('customers')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('id asc')
      .execute();

    let customers = rows.map((row) => this.mapCustomer(row));

    if (q) {
      customers = customers.filter((customer) => {
        const haystack = [
          String(customer.name || ''),
          String(customer.phone || ''),
          String(customer.address || ''),
          String(customer.type || ''),
          String(customer.companyName || ''),
          String(customer.taxNumber || ''),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    if (filter === 'debt') {
      customers = customers.filter((customer) => Number(customer.balance || 0) > 0);
    }
    if (filter === 'vip') {
      customers = customers.filter((customer) => customer.type === 'vip');
    }
    if (filter === 'cash') {
      customers = customers.filter((customer) => customer.type === 'cash');
    }

    if (!('page' in query) && !('pageSize' in query) && !q && filter === 'all') {
      return { customers };
    }

    const totalItems = customers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      customers: customers.slice(start, start + pageSize),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        totalCustomers: customers.length,
        totalBalance: customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0),
        totalCredit: customers.reduce((sum, customer) => sum + Number(customer.creditLimit || 0), 0),
        vipCount: customers.filter((customer) => customer.type === 'vip').length,
      },
    };
  }

  async createCustomer(payload: UpsertCustomerDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) {
      throw new AppError('Customer name is required', 'CUSTOMER_NAME_REQUIRED', 400);
    }

    if (await this.customerNameExists(name)) {
      throw new AppError('Customer already exists', 'CUSTOMER_EXISTS', 400);
    }

    await this.db
      .insertInto('customers')
      .values({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        balance: Number(payload.balance || 0),
        customer_type: payload.type === 'vip' ? 'vip' : 'cash',
        credit_limit: Number(payload.creditLimit || 0),
        store_credit_balance: Number(payload.storeCreditBalance || 0),
        company_name: String(payload.companyName || '').trim(),
        tax_number: String(payload.taxNumber || '').trim(),
        is_active: true,
      })
      .execute();

    await this.audit.log('إضافة عميل', `تم إضافة العميل ${name} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listCustomers({});
    return { ok: true, customers: listing.customers };
  }

  async updateCustomer(id: number, payload: UpsertCustomerDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db
      .selectFrom('customers')
      .select(['id'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!existing) {
      throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    const name = String(payload.name || '').trim();
    if (!name) {
      throw new AppError('Customer name is required', 'CUSTOMER_NAME_REQUIRED', 400);
    }

    if (await this.customerNameExists(name, id)) {
      throw new AppError('Customer already exists', 'CUSTOMER_EXISTS', 400);
    }

    await this.db
      .updateTable('customers')
      .set({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        balance: Number(payload.balance || 0),
        customer_type: payload.type === 'vip' ? 'vip' : 'cash',
        credit_limit: Number(payload.creditLimit || 0),
        store_credit_balance: Number(payload.storeCreditBalance || 0),
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

    if (!customer) {
      throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    if (Math.abs(Number(customer.balance || 0)) > 0.0001) {
      throw new AppError('Customer has outstanding balance', 'CUSTOMER_HAS_BALANCE', 400);
    }

    if (Math.abs(Number(customer.store_credit_balance || 0)) > 0.0001) {
      throw new AppError('Customer has store credit balance', 'CUSTOMER_HAS_CREDIT', 400);
    }

    const salesCount = await this.db
      .selectFrom('sales')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('customer_id', '=', id)
      .executeTakeFirstOrThrow();

    const paymentCount = await this.db
      .selectFrom('customer_payments')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('customer_id', '=', id)
      .executeTakeFirstOrThrow();

    const ledgerCount = await this.db
      .selectFrom('customer_ledger')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('customer_id', '=', id)
      .executeTakeFirstOrThrow();

    if (Number(salesCount.count || 0) || Number(paymentCount.count || 0) || Number(ledgerCount.count || 0)) {
      throw new AppError('Customer has financial history and cannot be deleted', 'CUSTOMER_HAS_HISTORY', 400);
    }

    await this.db.deleteFrom('product_customer_prices').where('customer_id', '=', id).execute();

    await this.db
      .updateTable('customers')
      .set({
        is_active: false,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('حذف عميل', `تم حذف العميل #${id} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listCustomers({});
    return { ok: true, customers: listing.customers };
  }

  async listSuppliers(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(5, Number(query.pageSize || 20)));
    const q = String(query.q || '').trim().toLowerCase();
    const filter = String(query.filter || 'all');

    const rows = await this.db
      .selectFrom('suppliers')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('id asc')
      .execute();

    let suppliers = rows.map((row) => this.mapSupplier(row));

    if (q) {
      suppliers = suppliers.filter((supplier) => {
        const haystack = [
          String(supplier.name || ''),
          String(supplier.phone || ''),
          String(supplier.address || ''),
          String(supplier.notes || ''),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    if (filter === 'debt') {
      suppliers = suppliers.filter((supplier) => Number(supplier.balance || 0) > 0);
    }
    if (filter === 'withNotes') {
      suppliers = suppliers.filter((supplier) => Boolean(supplier.notes));
    }

    if (!('page' in query) && !('pageSize' in query) && !q && filter === 'all') {
      return { suppliers };
    }

    const totalItems = suppliers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      suppliers: suppliers.slice(start, start + pageSize),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        totalSuppliers: suppliers.length,
        totalBalance: suppliers.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0),
        withNotes: suppliers.filter((supplier) => Boolean(supplier.notes)).length,
      },
    };
  }

  async createSupplier(payload: UpsertSupplierDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) {
      throw new AppError('Supplier name is required', 'SUPPLIER_NAME_REQUIRED', 400);
    }

    if (await this.supplierNameExists(name)) {
      throw new AppError('Supplier already exists', 'SUPPLIER_EXISTS', 400);
    }

    await this.db
      .insertInto('suppliers')
      .values({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        balance: Number(payload.balance || 0),
        notes: String(payload.notes || '').trim(),
        is_active: true,
      })
      .execute();

    await this.audit.log('إضافة مورد', `تم إضافة المورد ${name} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listSuppliers({});
    return { ok: true, suppliers: listing.suppliers };
  }

  async updateSupplier(id: number, payload: UpsertSupplierDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db
      .selectFrom('suppliers')
      .select(['id'])
      .where('id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!existing) {
      throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    const name = String(payload.name || '').trim();
    if (!name) {
      throw new AppError('Supplier name is required', 'SUPPLIER_NAME_REQUIRED', 400);
    }

    if (await this.supplierNameExists(name, id)) {
      throw new AppError('Supplier already exists', 'SUPPLIER_EXISTS', 400);
    }

    await this.db
      .updateTable('suppliers')
      .set({
        name,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        balance: Number(payload.balance || 0),
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

    if (!supplier) {
      throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    if (Math.abs(Number(supplier.balance || 0)) > 0.0001) {
      throw new AppError('Supplier has outstanding balance', 'SUPPLIER_HAS_BALANCE', 400);
    }

    const purchaseCount = await this.db
      .selectFrom('purchases')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('supplier_id', '=', id)
      .executeTakeFirstOrThrow();

    const paymentCount = await this.db
      .selectFrom('supplier_payments')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('supplier_id', '=', id)
      .executeTakeFirstOrThrow();

    const ledgerCount = await this.db
      .selectFrom('supplier_ledger')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('supplier_id', '=', id)
      .executeTakeFirstOrThrow();

    if (Number(purchaseCount.count || 0) || Number(paymentCount.count || 0) || Number(ledgerCount.count || 0)) {
      throw new AppError('Supplier has financial history and cannot be deleted', 'SUPPLIER_HAS_HISTORY', 400);
    }

    const inUse = await this.db
      .selectFrom('products')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('supplier_id', '=', id)
      .where('is_active', '=', true)
      .executeTakeFirstOrThrow();

    if (Number(inUse.count || 0) > 0) {
      throw new AppError('Supplier is used by products', 'SUPPLIER_IN_USE', 400);
    }

    await this.db
      .updateTable('suppliers')
      .set({
        is_active: false,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    await this.audit.log('حذف مورد', `تم حذف المورد #${id} بواسطة ${actor.username}`, actor.userId);

    const listing = await this.listSuppliers({});
    return { ok: true, suppliers: listing.suppliers };
  }
}
