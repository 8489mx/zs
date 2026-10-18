import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Upgrade pos_modifier_groups with is_splittable_in_half (Foodics Half-and-Half pizza/modifier feature)
  await sql`
    ALTER TABLE pos_modifier_groups
      ADD COLUMN IF NOT EXISTS is_splittable_in_half BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE product_pos_modifiers
      ADD COLUMN IF NOT EXISTS is_splittable_in_half BOOLEAN DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS default_options_ids JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS excluded_options_ids JSONB DEFAULT NULL;

    ALTER TABLE pos_modifier_options
      ADD COLUMN IF NOT EXISTS portion_allowed VARCHAR(20) NOT NULL DEFAULT 'both',
      ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER DEFAULT 0;

    ALTER TABLE pos_delivery_aggregators
      ADD COLUMN IF NOT EXISTS price_markup_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS price_markup_fixed NUMERIC(14, 2) NOT NULL DEFAULT 0.00;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE pos_modifier_groups
      DROP COLUMN IF EXISTS is_splittable_in_half;

    ALTER TABLE product_pos_modifiers
      DROP COLUMN IF EXISTS is_splittable_in_half,
      DROP COLUMN IF EXISTS default_options_ids,
      DROP COLUMN IF EXISTS excluded_options_ids;

    ALTER TABLE pos_modifier_options
      DROP COLUMN IF EXISTS portion_allowed,
      DROP COLUMN IF EXISTS preparation_time_minutes;

    ALTER TABLE pos_delivery_aggregators
      DROP COLUMN IF EXISTS price_markup_percentage,
      DROP COLUMN IF EXISTS price_markup_fixed;
  `.execute(db);
}
