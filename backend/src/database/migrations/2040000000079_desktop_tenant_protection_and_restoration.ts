import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    const isDesktop = process.env.APP_MODE === 'SELF_CONTAINED' 
      || process.env.PORTABLE_MODE === 'true' 
      || process.env.IS_ELECTRON === 'true';

    // Strictly skip in SaaS / Cloud / CI test environments
    if (!isDesktop) {
      console.log('[Migration 79] Skipped in SaaS/Cloud mode (desktop-only restoration).');
      return;
    }

    await sql`
      DO $$
      DECLARE
        v_plan_id INT;
        v_default_store_name TEXT := 'المتجر الرئيسي';
      BEGIN
        RAISE NOTICE '[Migration 79] Applying desktop store tenant restoration and protection.';

        -- 1. Try to read store name from existing settings if available
        BEGIN
          SELECT value INTO v_default_store_name FROM settings WHERE key = 'storeName' LIMIT 1;
          v_default_store_name := TRIM(BOTH '"' FROM v_default_store_name);
          IF v_default_store_name IS NULL OR length(v_default_store_name) = 0 THEN
            v_default_store_name := 'المتجر الرئيسي';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          v_default_store_name := 'المتجر الرئيسي';
        END;

        -- 2. Guarantee tenant 'default' exists and is active with perpetual validity
        IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'default') THEN
          INSERT INTO tenants (
            id, slug, business_name, owner_name, owner_phone, status,
            plan_id, trial_starts_at, trial_ends_at, activated_at, created_at, updated_at
          ) VALUES (
            'default', 'default', v_default_store_name, 'المسؤول', '0000000000', 'active',
            'plan_ultimate', NOW(), NOW() + INTERVAL '100 years', NOW(), NOW(), NOW()
          );
        ELSE
          UPDATE tenants
          SET status = 'active',
              plan_id = COALESCE(plan_id, 'plan_ultimate'),
              trial_ends_at = NOW() + INTERVAL '100 years',
              updated_at = NOW()
          WHERE id = 'default';
        END IF;

        -- 3. Guarantee perpetual active subscription for 'default'
        SELECT id INTO v_plan_id FROM saas_plans ORDER BY id LIMIT 1;
        IF v_plan_id IS NULL THEN
          v_plan_id := 1;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM tenant_subscriptions WHERE tenant_id = 'default') THEN
          INSERT INTO tenant_subscriptions (
            tenant_id, plan_id, status, starts_at, ends_at, grace_ends_at, auto_renew, created_at, updated_at
          ) VALUES (
            'default', v_plan_id, 'active', NOW(), NOW() + INTERVAL '100 years', NOW() + INTERVAL '100 years', true, NOW(), NOW()
          );
        ELSE
          UPDATE tenant_subscriptions
          SET status = 'active',
              ends_at = NOW() + INTERVAL '100 years',
              grace_ends_at = NOW() + INTERVAL '100 years',
              updated_at = NOW()
          WHERE tenant_id = 'default';
        END IF;

      END $$;
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op
  },
};
