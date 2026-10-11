import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create restaurant_table_reservations table
  await db.schema
    .createTable('restaurant_table_reservations')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('table_number', 'text', (col) => col.notNull())
    .addColumn('guest_name', 'text', (col) => col.notNull())
    .addColumn('guest_phone', 'text')
    .addColumn('guest_count', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('reservation_time', 'timestamptz', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('confirmed')) // 'confirmed' | 'seated' | 'cancelled' | 'no_show'
    .addColumn('special_requests', 'text')
    .addColumn('created_by', 'integer')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // 2. Indexes for tenant isolation and fast timeline lookups
  await db.schema
    .createIndex('idx_table_reservations_tenant_time')
    .ifNotExists()
    .on('restaurant_table_reservations')
    .columns(['tenant_id', 'reservation_time'])
    .execute();

  await db.schema
    .createIndex('idx_table_reservations_tenant_table')
    .ifNotExists()
    .on('restaurant_table_reservations')
    .columns(['tenant_id', 'table_number'])
    .execute();

  await db.schema
    .createIndex('idx_table_reservations_tenant_status')
    .ifNotExists()
    .on('restaurant_table_reservations')
    .columns(['tenant_id', 'status'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('restaurant_table_reservations').ifExists().execute();
}
