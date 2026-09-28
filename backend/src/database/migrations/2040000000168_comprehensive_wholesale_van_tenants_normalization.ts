import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000168: Comprehensive Wholesale Van Tenants Normalization
 *
 * Normalizes all tenants whose business name, store name, or activity references wholesale/distribution
 * (including Arabic variations like "جملة" or "جمله" or "توزيع" or "فان").
 * Enforces 'wholesale_van' activity_type, disables POS, enables delivery fleet and van sales.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Identify wholesale/van tenants across tenants and settings tables
    const candidateRows = await sql<{ tenant_id: string }>`
      SELECT DISTINCT t.id as tenant_id
      FROM tenants t
      WHERE t.id NOT IN ('zs', 'default', 'dev-tenant')
        AND (
          t.business_name ILIKE '%جمل%'
          OR t.business_name ILIKE '%توزيع%'
          OR t.business_name ILIKE '%فان%'
          OR t.business_name ILIKE '%مناديب%'
          OR t.business_name ILIKE '%wholesale%'
          OR t.activity_type ILIKE '%جمل%'
          OR t.activity_type ILIKE '%توزيع%'
          OR t.activity_type ILIKE '%فان%'
          OR t.activity_type ILIKE '%wholesale%'
        )
      UNION
      SELECT DISTINCT s.tenant_id
      FROM settings s
      WHERE s.tenant_id NOT IN ('zs', 'default', 'dev-tenant')
        AND s.key IN ('storeName', 'companyName', 'business_name', 'store_name', 'businessIndustry', 'activityType')
        AND (
          s.value::text ILIKE '%جمل%'
          OR s.value::text ILIKE '%توزيع%'
          OR s.value::text ILIKE '%فان%'
          OR s.value::text ILIKE '%wholesale%'
        )
    `.execute(db);

    const tenantIds = candidateRows.rows.map((r) => r.tenant_id).filter(Boolean);
    if (tenantIds.length === 0) return;

    // 2. Normalize tenants.activity_type to 'wholesale_van'
    await sql`
      UPDATE tenants
      SET activity_type = 'wholesale_van', updated_at = NOW()
      WHERE id = ANY(${tenantIds});
    `.execute(db);

    // 3. Upsert settings to disable POS and enable delivery fleet & enterprise modules
    for (const tid of tenantIds) {
      const settingsToUpsert = [
        { key: 'activityType', value: JSON.stringify('wholesale_van') },
        { key: 'businessIndustry', value: JSON.stringify('wholesale_van') },
        { key: 'posModuleEnabled', value: JSON.stringify(false) },
        { key: 'requireCashierShiftForSales', value: JSON.stringify(false) },
        { key: 'deliveryFleetModuleEnabled', value: JSON.stringify(true) },
        { key: 'enableEnterpriseFeatures', value: JSON.stringify(true) },
        { key: 'installmentsModuleEnabled', value: JSON.stringify(true) },
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
    // Data normalization migration; non-destructive
  },
};
