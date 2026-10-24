import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE import_customs_tariffs
      ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
      ADD COLUMN IF NOT EXISTS category_ar VARCHAR(255),
      ADD COLUMN IF NOT EXISTS official_source VARCHAR(255) DEFAULT 'القرار الجمهوري 218 لسنة 2022 وتعديلاته',
      ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT TRUE;

    CREATE INDEX IF NOT EXISTS idx_import_customs_tariffs_sector
      ON import_customs_tariffs(tenant_id, sector);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS idx_import_customs_tariffs_sector;

    ALTER TABLE import_customs_tariffs
      DROP COLUMN IF EXISTS is_official,
      DROP COLUMN IF EXISTS official_source,
      DROP COLUMN IF EXISTS category_ar,
      DROP COLUMN IF EXISTS sector;
  `.execute(db);
}
