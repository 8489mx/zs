import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Warehouse Packages (Pallets, Boxes, Cartons)
  await db.schema
    .createTable('warehouse_packages')
    .ifNotExists()
    .addColumn('id', 'varchar(128)', (col) => col.primaryKey())
    .addColumn('tenant_id', 'varchar(64)', (col) => col.notNull())
    .addColumn('package_number', 'varchar(64)', (col) => col.notNull())
    .addColumn('package_type', 'varchar(32)', (col) => col.notNull().defaultTo('box'))
    .addColumn('parent_package_id', 'varchar(128)')
    .addColumn('warehouse_id', 'integer')
    .addColumn('location_id', 'integer')
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('sealed'))
    .addColumn('gross_weight_kg', 'numeric(12, 3)')
    .addColumn('net_weight_kg', 'numeric(12, 3)')
    .addColumn('notes', 'text')
    .addColumn('created_by', 'varchar(64)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_wh_packages_tenant_number')
    .ifNotExists()
    .on('warehouse_packages')
    .columns(['tenant_id', 'package_number'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_wh_packages_tenant_parent')
    .ifNotExists()
    .on('warehouse_packages')
    .columns(['tenant_id', 'parent_package_id'])
    .execute();

  await db.schema
    .createIndex('idx_wh_packages_tenant_status')
    .ifNotExists()
    .on('warehouse_packages')
    .columns(['tenant_id', 'status'])
    .execute();

  // 2. Package Items
  await db.schema
    .createTable('warehouse_package_items')
    .ifNotExists()
    .addColumn('id', 'varchar(128)', (col) => col.primaryKey())
    .addColumn('tenant_id', 'varchar(64)', (col) => col.notNull())
    .addColumn('package_id', 'varchar(128)', (col) =>
      col.notNull().references('warehouse_packages.id').onDelete('cascade'),
    )
    .addColumn('product_id', 'integer', (col) => col.notNull())
    .addColumn('quantity', 'numeric(14, 4)', (col) => col.notNull())
    .addColumn('unit_name', 'varchar(32)', (col) => col.defaultTo('قطعة'))
    .addColumn('batch_number', 'varchar(64)')
    .addColumn('serial_numbers', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_wh_pkg_items_tenant_pkg')
    .ifNotExists()
    .on('warehouse_package_items')
    .columns(['tenant_id', 'package_id'])
    .execute();

  await db.schema
    .createIndex('idx_wh_pkg_items_tenant_prod')
    .ifNotExists()
    .on('warehouse_package_items')
    .columns(['tenant_id', 'product_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('warehouse_package_items').ifExists().execute();
  await db.schema.dropTable('warehouse_packages').ifExists().execute();
}
