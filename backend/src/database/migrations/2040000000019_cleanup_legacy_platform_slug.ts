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
    `.execute(db).catch(() => undefined);

    await sql`
      UPDATE saas_tenants 
      SET slug = 'zsystems',
          business_name = CASE WHEN business_name IS NULL OR business_name = '' OR business_name = 'النظام الأساسي' THEN 'Z-Systems' ELSE business_name END,
          owner_name = CASE WHEN owner_name IS NULL OR owner_name = '' OR owner_name = 'المسؤول' THEN 'Z-Systems' ELSE owner_name END,
          owner_phone = CASE WHEN owner_phone IS NULL OR owner_phone = '' OR owner_phone = '01000000000' OR owner_phone = '0000000000' THEN '01018017523' ELSE owner_phone END,
          owner_email = CASE WHEN owner_email IS NULL OR owner_email = '' THEN '8489mz@gmail.com' ELSE owner_email END
      WHERE slug = 'karimzakaria-demo' OR id = 'karimzakaria-demo'
    `.execute(db).catch(() => undefined);

    const tables = [
      'tenants', 'users', 'settings', 'branches', 'stock_locations', 
      'customers', 'suppliers', 'products', 'product_units', 'sales', 
      'purchases', 'expenses', 'treasury_transactions', 'cashier_shifts', 
      'accounting_journals', 'accounting_accounts', 'hr_employees'
    ];
    for (const tbl of tables) {
      await sql`UPDATE ${sql.raw(tbl)} SET tenant_id = 'default' WHERE tenant_id = 'karimzakaria-demo'`.execute(db).catch(() => undefined);
      await sql`UPDATE ${sql.raw(tbl)} SET account_id = 'default' WHERE account_id = 'karimzakaria-demo'`.execute(db).catch(() => undefined);
    }
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op
  },
};
