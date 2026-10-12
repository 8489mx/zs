import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create restaurant_86_items table (Real-time Out-of-Stock / Fast 86 Engine)
  await db.schema
    .createTable('restaurant_86_items')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('product_id', 'bigint', (col) => col.notNull())
    .addColumn('product_name', 'text', (col) => col.notNull())
    .addColumn('component_product_id', 'bigint')
    .addColumn('is_86ed', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('reason', 'text', (col) => col.defaultTo('نفاد الكمية'))
    .addColumn('auto_restore_at', 'timestamptz')
    .addColumn('created_by', 'integer')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_rest_86_tenant_product')
    .ifNotExists()
    .on('restaurant_86_items')
    .columns(['tenant_id', 'product_id', 'is_86ed'])
    .execute();

  // 2. Create restaurant_tip_pools and distributions tables
  await db.schema
    .createTable('restaurant_tip_pools')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('shift_date', 'date', (col) => col.notNull().defaultTo(sql`CURRENT_DATE`))
    .addColumn('shift_name', 'text', (col) => col.notNull().defaultTo('وردية العمل'))
    .addColumn('total_cash_tips', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('total_card_tips', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('total_tips', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('distribution_method', 'text', (col) => col.notNull().defaultTo('roles')) // 'roles' | 'hours' | 'equal'
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft')) // 'draft' | 'distributed' | 'cancelled'
    .addColumn('notes', 'text')
    .addColumn('distributed_by', 'integer')
    .addColumn('distributed_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_tip_pools_tenant_date')
    .ifNotExists()
    .on('restaurant_tip_pools')
    .columns(['tenant_id', 'shift_date'])
    .execute();

  await db.schema
    .createTable('restaurant_tip_pool_distributions')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('pool_id', 'integer', (col) => col.notNull())
    .addColumn('employee_id', 'integer', (col) => col.notNull())
    .addColumn('employee_name', 'text', (col) => col.notNull())
    .addColumn('role_name', 'text', (col) => col.notNull().defaultTo('waiter'))
    .addColumn('hours_worked', 'numeric(6, 2)', (col) => col.notNull().defaultTo(8))
    .addColumn('point_weight', 'numeric(5, 2)', (col) => col.notNull().defaultTo(1))
    .addColumn('allocated_amount', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('is_paid', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('paid_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_tip_dist_tenant_pool')
    .ifNotExists()
    .on('restaurant_tip_pool_distributions')
    .columns(['tenant_id', 'pool_id'])
    .execute();

  // 3. Create restaurant_table_zones table for multi-zone visual floor plans
  await db.schema
    .createTable('restaurant_table_zones')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('zone_code', 'text', (col) => col.notNull()) // 'main', 'patio', 'family', 'vip', 'terrace'
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('capacity_seats', 'integer', (col) => col.notNull().defaultTo(4))
    .addColumn('table_numbers', 'jsonb', (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_table_zones_tenant')
    .ifNotExists()
    .on('restaurant_table_zones')
    .columns(['tenant_id', 'zone_code'])
    .execute();

  // 4. Create restaurant_prep_sheets and items tables for central/shift kitchen preparation
  await db.schema
    .createTable('restaurant_prep_sheets')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('prep_date', 'date', (col) => col.notNull().defaultTo(sql`CURRENT_DATE`))
    .addColumn('shift_type', 'text', (col) => col.notNull().defaultTo('morning')) // 'morning', 'evening', 'night'
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('in_progress')) // 'in_progress', 'completed'
    .addColumn('prepared_by', 'integer')
    .addColumn('completed_at', 'timestamptz')
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('restaurant_prep_sheet_items')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('prep_sheet_id', 'integer', (col) => col.notNull())
    .addColumn('product_id', 'bigint', (col) => col.notNull())
    .addColumn('product_name', 'text', (col) => col.notNull())
    .addColumn('unit_name', 'text', (col) => col.notNull().defaultTo('كجم'))
    .addColumn('par_level', 'numeric(12, 3)', (col) => col.notNull().defaultTo(0))
    .addColumn('current_on_hand', 'numeric(12, 3)', (col) => col.notNull().defaultTo(0))
    .addColumn('prep_required', 'numeric(12, 3)', (col) => col.notNull().defaultTo(0))
    .addColumn('prep_actual', 'numeric(12, 3)', (col) => col.notNull().defaultTo(0))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending')) // 'pending', 'prepped'
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_prep_sheet_items_tenant_sheet')
    .ifNotExists()
    .on('restaurant_prep_sheet_items')
    .columns(['tenant_id', 'prep_sheet_id'])
    .execute();

  // 5. Create restaurant_stamp_cards table for cafe and F&B digital punch card loyalty
  await db.schema
    .createTable('restaurant_stamp_cards')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('customer_id', 'bigint', (col) => col.notNull())
    .addColumn('program_name', 'text', (col) => col.notNull().defaultTo('كوبون المشروبات والقهوة'))
    .addColumn('target_stamps', 'integer', (col) => col.notNull().defaultTo(6))
    .addColumn('current_stamps', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('total_completed_cards', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('reward_description', 'text', (col) => col.notNull().defaultTo('مشروب مجاني عند اكتمال الختم'))
    .addColumn('last_stamped_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_stamp_cards_tenant_customer')
    .ifNotExists()
    .on('restaurant_stamp_cards')
    .columns(['tenant_id', 'customer_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('restaurant_stamp_cards').ifExists().execute();
  await db.schema.dropTable('restaurant_prep_sheet_items').ifExists().execute();
  await db.schema.dropTable('restaurant_prep_sheets').ifExists().execute();
  await db.schema.dropTable('restaurant_table_zones').ifExists().execute();
  await db.schema.dropTable('restaurant_tip_pool_distributions').ifExists().execute();
  await db.schema.dropTable('restaurant_tip_pools').ifExists().execute();
  await db.schema.dropTable('restaurant_86_items').ifExists().execute();
}
