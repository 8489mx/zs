import { Kysely, Migration, sql } from 'kysely';

/**
 * Migration 2040000000209: Normalize Almhnds & Retail Tenants
 *
 * Fixes tenant 'almhnds' ("المهندس") and any retail/commercial plan tenant
 * whose activity_type or settings were mistakenly set to 'services' or consulting,
 * ensuring they are correctly configured as 'retail_general' with POS, cash drawer,
 * and inventory fully enabled.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // 1. Normalize tenant 'almhnds' and any commerce/retail plan tenant mistakenly set to 'services'
  await sql`
    UPDATE tenants
    SET activity_type = 'retail_general',
        updated_at = NOW()
    WHERE slug = 'almhnds'
       OR (
         activity_type IN ('services', 'consulting')
         AND (
           plan_id IN ('plan_ultimate', 'plan_omnichannel', 'plan_pro', 'plan_basic')
           OR plan_id LIKE 'tier_band1_%'
           OR plan_id LIKE 'tier_band2_%'
           OR plan_id LIKE 'tier_band3_%'
         )
       );
  `.execute(db);

  // 2. Ensure settings for almhnds and retail tenants reflect retail_general
  await sql`
    UPDATE settings s
    SET value = '"retail_general"'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key IN ('businessIndustry', 'activityType')
      AND (
        t.slug = 'almhnds'
        OR t.activity_type = 'retail_general'
      );
  `.execute(db);

  // 3. Force posModuleEnabled to true for almhnds and retail tenants
  await sql`
    UPDATE settings s
    SET value = 'true'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key = 'posModuleEnabled'
      AND (
        t.slug = 'almhnds'
        OR t.activity_type = 'retail_general'
      );
  `.execute(db);

  // 4. Force requireCashierShiftForSales to true for almhnds and retail tenants
  await sql`
    UPDATE settings s
    SET value = 'true'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key = 'requireCashierShiftForSales'
      AND (
        t.slug = 'almhnds'
        OR t.activity_type = 'retail_general'
      );
  `.execute(db);

  // 5. Force inventoryModuleEnabled to true for almhnds and retail tenants
  await sql`
    UPDATE settings s
    SET value = 'true'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key = 'inventoryModuleEnabled'
      AND (
        t.slug = 'almhnds'
        OR t.activity_type = 'retail_general'
      );
  `.execute(db);

  // 6. Force servicesModuleEnabled to false for almhnds and retail tenants
  await sql`
    UPDATE settings s
    SET value = 'false'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key = 'servicesModuleEnabled'
      AND (
        t.slug = 'almhnds'
        OR t.activity_type = 'retail_general'
      );
  `.execute(db);

  // 7. Insert missing critical retail settings for almhnds if not already present
  await sql`
    INSERT INTO settings (tenant_id, account_id, key, value)
    SELECT t.id, 1, 'posModuleEnabled', 'true'
    FROM tenants t
    WHERE t.slug = 'almhnds'
    ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';
  `.execute(db);

  await sql`
    INSERT INTO settings (tenant_id, account_id, key, value)
    SELECT t.id, 1, 'inventoryModuleEnabled', 'true'
    FROM tenants t
    WHERE t.slug = 'almhnds'
    ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';
  `.execute(db);

  await sql`
    INSERT INTO settings (tenant_id, account_id, key, value)
    SELECT t.id, 1, 'servicesModuleEnabled', 'false'
    FROM tenants t
    WHERE t.slug = 'almhnds'
    ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'false';
  `.execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Operational settings normalization; no destructive rollback needed.
}

export const migration: Migration = {
  up,
  down,
};

export default migration;
