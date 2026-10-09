import { Kysely, Migration, sql } from 'kysely';

/**
 * Migration 2040000000205: Fix Retail Services Module Leakage
 *
 * Ensures that commercial retail tenants (stores, general retail, supermarkets, fashion)
 * do not have servicesModuleEnabled set to true from legacy plan syncs, and guarantees
 * posModuleEnabled is true so POS & cashier workstations are always available.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // 1. Reset servicesModuleEnabled to false for any non-services tenant
  await sql`
    UPDATE settings s
    SET value = 'false'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key = 'servicesModuleEnabled'
      AND (
        t.activity_type IS NULL 
        OR LOWER(t.activity_type) NOT IN ('services', 'consulting')
        AND LOWER(t.activity_type) NOT LIKE '%خدمات%'
        AND LOWER(t.activity_type) NOT LIKE '%استشار%'
      );
  `.execute(db);

  // 2. Ensure posModuleEnabled is true for all commercial retail tenants
  await sql`
    UPDATE settings s
    SET value = 'true'
    FROM tenants t
    WHERE s.tenant_id = t.id
      AND s.key = 'posModuleEnabled'
      AND (
        t.activity_type IS NULL
        OR LOWER(t.activity_type) IN (
          'retail', 'retail_general', 'supermarket', 'fashion', 'store', 
          'general', 'spices', 'perfumes', 'appliances_installments', 'auto_parts'
        )
        OR LOWER(t.activity_type) LIKE '%تجزئة%'
        OR LOWER(t.activity_type) LIKE '%متاجر%'
        OR LOWER(t.activity_type) LIKE '%سوبرماركت%'
      );
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
