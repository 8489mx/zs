import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000167: Fix Wholesale Van Tenant Settings and Activity
 *
 * Normalizes any tenant configured for wholesale/distribution mode whose activity_type
 * or settings defaulted to retail_general or retained posModuleEnabled = true.
 * Sets activity_type to 'wholesale_van', disables POS, and enables delivery fleet features.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Identify wholesale/van tenants from settings or activity_type
    const wholesaleTenants = await sql<{ tenant_id: string }>`
      SELECT DISTINCT tenant_id
      FROM settings
      WHERE (
        (key = 'businessIndustry' AND (value::text ILIKE '%wholesale%' OR value::text ILIKE '%توزيع%' OR value::text ILIKE '%جملة%'))
        OR (key = 'activityType' AND (value::text ILIKE '%wholesale%' OR value::text ILIKE '%توزيع%' OR value::text ILIKE '%جملة%'))
      )
    `.execute(db);

    const tenantIds = wholesaleTenants.rows.map((r) => r.tenant_id);
    if (tenantIds.length === 0) return;

    // 2. Update tenants.activity_type to 'wholesale_van'
    await sql`
      UPDATE tenants
      SET activity_type = 'wholesale_van', updated_at = NOW()
      WHERE id = ANY(${tenantIds})
        AND (activity_type IS NULL OR activity_type = 'retail_general' OR activity_type = 'general' OR activity_type = 'retail' OR activity_type ILIKE '%wholesale%' OR activity_type ILIKE '%توزيع%' OR activity_type ILIKE '%جملة%');
    `.execute(db);

    // 3. Upsert settings for these tenants to disable POS and enable Fleet/Enterprise
    for (const tid of tenantIds) {
      const settingsToUpsert = [
        { key: 'activityType', value: JSON.stringify('wholesale_van') },
        { key: 'businessIndustry', value: JSON.stringify('wholesale_van') },
        { key: 'posModuleEnabled', value: JSON.stringify(false) },
        { key: 'requireCashierShiftForSales', value: JSON.stringify(false) },
        { key: 'deliveryFleetModuleEnabled', value: JSON.stringify(true) },
        { key: 'enableEnterpriseFeatures', value: JSON.stringify(true) },
      ];

      for (const s of settingsToUpsert) {
        await sql`
          INSERT INTO settings (tenant_id, account_id, key, value)
          VALUES (${tid}, ${tid || 'main'}, ${s.key}, ${s.value}::jsonb)
          ON CONFLICT (tenant_id, key)
          DO UPDATE SET value = EXCLUDED.value;
        `.execute(db);
      }
    }
  },

  down: async (_db: Kysely<any>): Promise<void> => {
    // Data normalization migration; no destructive schema rollback required
  },
};
