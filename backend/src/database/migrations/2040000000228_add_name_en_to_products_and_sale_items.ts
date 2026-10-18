import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) DEFAULT NULL;

    CREATE INDEX IF NOT EXISTS idx_products_name_en
      ON products(tenant_id, name_en)
      WHERE is_active = true AND name_en IS NOT NULL;

    ALTER TABLE sale_items
      ADD COLUMN IF NOT EXISTS product_name_en VARCHAR(255) DEFAULT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS idx_products_name_en;

    ALTER TABLE products
      DROP COLUMN IF EXISTS name_en;

    ALTER TABLE sale_items
      DROP COLUMN IF EXISTS product_name_en;
  `.execute(db);
}
