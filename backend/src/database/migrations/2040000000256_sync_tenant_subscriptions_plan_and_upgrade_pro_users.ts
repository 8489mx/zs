import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

/**
 * Migration 2040000000256:
 * 1. Synchronize tenant_subscriptions with tenants.plan_id so tenants upgraded to Pro/Ultimate/Omnichannel
 *    do not get throttled by legacy/initial basic subscription records (max_users = 2).
 * 2. Upgrade Pro plan (code = 'PRO') max_users in saas_plans from 6 to 10 (matching Band 1 Level 2 in PRICING_AND_PACKAGING.md).
 * 3. Ensure Ultimate plan (code = 'ULTIMATE') is unlimited (max_users = NULL) matching engine and tier specifications.
 */
export async function up(db: Kysely<Database>): Promise<void> {
  // 1. Upgrade PRO plan max_users to 10
  await sql`
    UPDATE saas_plans
    SET max_users = 10
    WHERE code = 'PRO';
  `.execute(db);

  // 2. Set ULTIMATE plan max_users to NULL (unlimited)
  await sql`
    UPDATE saas_plans
    SET max_users = NULL
    WHERE code = 'ULTIMATE';
  `.execute(db);

  // 3. Synchronize tenant_subscriptions to match tenants.plan_id
  await sql`
    UPDATE tenant_subscriptions ts
    SET plan_id = sp.id, updated_at = NOW()
    FROM tenants t
    JOIN saas_plans sp ON (
      sp.feature_plan_id = t.plan_id 
      OR sp.code = UPPER(REPLACE(t.plan_id, 'plan_', '')) 
      OR LOWER(sp.code) = LOWER(t.plan_id)
    )
    WHERE ts.tenant_id = t.id
      AND ts.plan_id != sp.id
      AND sp.is_active = true;
  `.execute(db);
}

export async function down(_db: Kysely<Database>): Promise<void> {
  // Safe additive data migration, no-op on rollback
}
