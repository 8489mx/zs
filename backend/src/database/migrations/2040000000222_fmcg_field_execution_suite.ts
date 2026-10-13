import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. van_store_visits: Structured In-Store Visits with Geofencing, dwell time, and no-sale reasons
  await db.schema
    .createTable('van_store_visits')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('account_id', 'integer', (col) => col.notNull())
    .addColumn('trip_id', 'integer')
    .addColumn('rep_id', 'integer', (col) => col.notNull())
    .addColumn('customer_id', 'integer', (col) => col.notNull())
    .addColumn('customer_name', 'text')
    .addColumn('check_in_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('check_out_at', 'timestamptz')
    .addColumn('dwell_time_seconds', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('check_in_lat', 'numeric(10, 7)')
    .addColumn('check_in_lng', 'numeric(10, 7)')
    .addColumn('is_geofence_valid', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('geofence_distance_meters', 'numeric(10, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('has_sale', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('sale_id', 'integer')
    .addColumn('sale_amount', 'numeric(14, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('has_collection', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('collection_amount', 'numeric(14, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('no_sale_reason', 'text') // 'store_closed', 'sufficient_stock', 'owner_absent', 'price_dispute', 'credit_limit_exceeded', 'other'
    .addColumn('no_sale_notes', 'text')
    .addColumn('store_inventory', 'jsonb', (col) => col.defaultTo('[]')) // Optional in-store shelf stock
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_van_store_visits_tenant_trip')
    .ifNotExists()
    .on('van_store_visits')
    .columns(['tenant_id', 'trip_id'])
    .execute();

  await db.schema
    .createIndex('idx_van_store_visits_tenant_rep_date')
    .ifNotExists()
    .on('van_store_visits')
    .columns(['tenant_id', 'rep_id', 'check_in_at'])
    .execute();

  // 2. van_trade_marketing_surveys: Assets/Coolers inspection and competitor surveys
  await db.schema
    .createTable('van_trade_marketing_surveys')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('account_id', 'integer', (col) => col.notNull())
    .addColumn('visit_id', 'integer')
    .addColumn('trip_id', 'integer')
    .addColumn('rep_id', 'integer', (col) => col.notNull())
    .addColumn('customer_id', 'integer', (col) => col.notNull())
    .addColumn('survey_type', 'text', (col) => col.notNull()) // 'cooler_inspection', 'asset_tracking', 'competitor_survey'
    .addColumn('asset_id', 'text')
    .addColumn('asset_name', 'text')
    .addColumn('asset_condition', 'text') // 'excellent', 'good', 'needs_maintenance', 'damaged', 'missing'
    .addColumn('is_pure_company_products', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('temperature_celsius', 'numeric(5, 2)')
    .addColumn('cleanliness_rating', 'integer', (col) => col.defaultTo(5))
    .addColumn('photo_url', 'text')
    .addColumn('competitor_name', 'text')
    .addColumn('competitor_product', 'text')
    .addColumn('competitor_price', 'numeric(12, 2)')
    .addColumn('competitor_offer_details', 'text')
    .addColumn('notes', 'text')
    .addColumn('metadata', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_van_surveys_tenant_trip')
    .ifNotExists()
    .on('van_trade_marketing_surveys')
    .columns(['tenant_id', 'trip_id'])
    .execute();

  await db.schema
    .createIndex('idx_van_surveys_tenant_customer')
    .ifNotExists()
    .on('van_trade_marketing_surveys')
    .columns(['tenant_id', 'customer_id'])
    .execute();

  // 3. van_rep_live_breadcrumbs: High-density GPS Breadcrumbs for live supervisor tracking
  await db.schema
    .createTable('van_rep_live_breadcrumbs')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('account_id', 'integer', (col) => col.notNull())
    .addColumn('trip_id', 'integer', (col) => col.notNull())
    .addColumn('rep_id', 'integer', (col) => col.notNull())
    .addColumn('latitude', 'numeric(10, 7)', (col) => col.notNull())
    .addColumn('longitude', 'numeric(10, 7)', (col) => col.notNull())
    .addColumn('speed_kmh', 'numeric(5, 2)', (col) => col.defaultTo(0))
    .addColumn('battery_level', 'integer', (col) => col.defaultTo(100))
    .addColumn('recorded_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_van_breadcrumbs_trip_time')
    .ifNotExists()
    .on('van_rep_live_breadcrumbs')
    .columns(['tenant_id', 'trip_id', 'recorded_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('van_rep_live_breadcrumbs').ifExists().execute();
  await db.schema.dropTable('van_trade_marketing_surveys').ifExists().execute();
  await db.schema.dropTable('van_store_visits').ifExists().execute();
}
