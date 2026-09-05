import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // Ensure all tenants have default XPay settings entries if not present
    const tenants = await db.selectFrom('tenants').select('id').execute();
    for (const t of tenants) {
      await sql`
        INSERT INTO settings (key, value, tenant_id)
        VALUES 
          ('storefront_xpay_api_key', '""', ${t.id}),
          ('storefront_xpay_community_id', '""', ${t.id}),
          ('storefront_xpay_test_mode', '"true"', ${t.id})
        ON CONFLICT (tenant_id, key) DO NOTHING
      `.execute(db);
    }
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DELETE FROM settings 
      WHERE key IN ('storefront_xpay_api_key', 'storefront_xpay_community_id', 'storefront_xpay_test_mode')
    `.execute(db);
  },
};
