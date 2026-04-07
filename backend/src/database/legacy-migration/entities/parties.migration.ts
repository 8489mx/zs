import { EntityCounters, MigrationContext } from '../types';
import { asBoolean, asNumber, asString, readAll } from '../utils';
import { syncIdSequence } from '../db';

interface OldUser {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  role: 'super_admin' | 'admin' | 'cashier';
  is_active: number;
  created_at: string;
}

interface OldCustomer {
  id: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
  customer_type: string;
  credit_limit: number;
  store_credit_balance: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface OldSupplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export async function migrateUsers(ctx: MigrationContext): Promise<EntityCounters> {
  const rows = readAll<OldUser>(ctx.oldDb, 'SELECT * FROM users ORDER BY id');
  const counters: EntityCounters = { scanned: rows.length, inserted: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      await ctx.newDb
        .insertInto('users')
        .values({
          id: asNumber(row.id),
          username: asString(row.username),
          password_hash: asString(row.password_hash),
          password_salt: asString(row.password_salt),
          role: row.role,
          is_active: asBoolean(row.is_active),
          permissions_json: '[]',
          branch_ids_json: '[]',
          default_branch_id: null,
          display_name: asString(row.username),
          must_change_password: false,
          failed_login_count: 0,
          locked_until: null,
          last_login_at: null,
          created_at: asString(row.created_at),
        })
        .onConflict((oc: any) => oc.column('id').doNothing())
        .execute();
      ctx.idMap.users.set(asNumber(row.id), asNumber(row.id));
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`user ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'users');
  return counters;
}

export async function migrateCustomers(ctx: MigrationContext): Promise<EntityCounters> {
  const rows = readAll<OldCustomer>(ctx.oldDb, 'SELECT * FROM customers ORDER BY id');
  const counters: EntityCounters = { scanned: rows.length, inserted: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      await ctx.newDb
        .insertInto('customers')
        .values({
          id: asNumber(row.id),
          name: asString(row.name),
          phone: asString(row.phone),
          address: asString(row.address),
          balance: asNumber(row.balance),
          customer_type: asString(row.customer_type, 'cash') === 'vip' ? 'vip' : 'cash',
          credit_limit: asNumber(row.credit_limit),
          store_credit_balance: asNumber(row.store_credit_balance),
          company_name: '',
          tax_number: '',
          is_active: asBoolean(row.is_active),
          created_at: asString(row.created_at),
          updated_at: asString(row.updated_at),
        })
        .onConflict((oc: any) => oc.column('id').doNothing())
        .execute();
      ctx.idMap.customers.set(asNumber(row.id), asNumber(row.id));
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`customer ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'customers');
  return counters;
}

export async function migrateSuppliers(ctx: MigrationContext): Promise<EntityCounters> {
  const rows = readAll<OldSupplier>(ctx.oldDb, 'SELECT * FROM suppliers ORDER BY id');
  const counters: EntityCounters = { scanned: rows.length, inserted: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      await ctx.newDb
        .insertInto('suppliers')
        .values({
          id: asNumber(row.id),
          name: asString(row.name),
          phone: asString(row.phone),
          address: asString(row.address),
          balance: asNumber(row.balance),
          notes: asString(row.notes),
          is_active: asBoolean(row.is_active),
          created_at: asString(row.created_at),
          updated_at: asString(row.updated_at),
        })
        .onConflict((oc: any) => oc.column('id').doNothing())
        .execute();
      ctx.idMap.suppliers.set(asNumber(row.id), asNumber(row.id));
      counters.inserted += 1;
    } catch (error) {
      counters.errors += 1;
      ctx.logger.error(`supplier ${row.id} failed: ${String(error)}`);
    }
  }

  await syncIdSequence(ctx.newDb, 'suppliers');
  return counters;
}
