import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create fmcg_promotions table for mix & match, tiered, and invoice promotions
  await db.schema
    .createTable('fmcg_promotions')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('promo_type', 'text', (col) => col.notNull().defaultTo('mix_and_match')) // 'mix_and_match', 'tiered_qty', 'invoice_threshold'
    .addColumn('apply_type', 'text', (col) => col.notNull().defaultTo('free_bonus')) // 'free_bonus', 'discount_percent', 'discount_amount'
    .addColumn('buy_conditions', 'jsonb', (col) => col.notNull().defaultTo('[]'))
    .addColumn('reward', 'jsonb', (col) => col.notNull().defaultTo('{}'))
    .addColumn('customer_types', 'jsonb', (col) => col.defaultTo('["all"]'))
    .addColumn('start_date', 'date')
    .addColumn('end_date', 'date')
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('max_applications_per_order', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('priority', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_fmcg_promos_tenant_active')
    .ifNotExists()
    .on('fmcg_promotions')
    .columns(['tenant_id', 'is_active'])
    .execute();

  await db.schema
    .createIndex('idx_fmcg_promos_tenant_code')
    .ifNotExists()
    .on('fmcg_promotions')
    .columns(['tenant_id', 'code'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('fmcg_promotions').ifExists().execute();
}
