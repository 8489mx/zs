import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      UPDATE tenants 
      SET slug = 'zsystems',
          business_name = CASE WHEN business_name IS NULL OR business_name = '' OR business_name = 'النظام الأساسي' THEN 'Z-Systems' ELSE business_name END,
          owner_name = CASE WHEN owner_name IS NULL OR owner_name = '' OR owner_name = 'المسؤول' THEN 'Z-Systems' ELSE owner_name END,
          owner_phone = CASE WHEN owner_phone IS NULL OR owner_phone = '' OR owner_phone = '01000000000' OR owner_phone = '0000000000' THEN '01018017523' ELSE owner_phone END,
          owner_email = CASE WHEN owner_email IS NULL OR owner_email = '' THEN '8489mz@gmail.com' ELSE owner_email END
      WHERE slug = 'karimzakaria-demo' OR id = 'karimzakaria-demo'
    `.execute(db);

    await sql`
      UPDATE users 
      SET tenant_id = 'default', account_id = 'default' 
      WHERE tenant_id = 'karimzakaria-demo'
    `.execute(db);

    await sql`
      UPDATE settings 
      SET tenant_id = 'default', account_id = 'default' 
      WHERE tenant_id = 'karimzakaria-demo'
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op
  },
};
