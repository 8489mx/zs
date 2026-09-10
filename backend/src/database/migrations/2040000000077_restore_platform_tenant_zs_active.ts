import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Restore platform root tenants ('zs', 'default', 'dev-tenant') to active status
    await sql`
      UPDATE tenants
      SET status = 'active',
          trial_ends_at = NOW() + INTERVAL '100 years'
      WHERE id IN ('zs', 'default', 'dev-tenant');
    `.execute(db);

    // 2. Ensure a perpetual active subscription exists for platform root tenant 'zs'
    await sql`
      DO $$
      DECLARE
        v_plan_id INT;
      BEGIN
        SELECT id INTO v_plan_id FROM saas_plans ORDER BY id LIMIT 1;
        IF v_plan_id IS NULL THEN
          v_plan_id := 1;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM tenant_subscriptions WHERE tenant_id = 'zs') THEN
          INSERT INTO tenant_subscriptions (
            tenant_id,
            plan_id,
            status,
            starts_at,
            ends_at,
            grace_ends_at,
            auto_renew,
            created_at,
            updated_at
          ) VALUES (
            'zs',
            v_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '100 years',
            NOW() + INTERVAL '100 years',
            true,
            NOW(),
            NOW()
          );
        ELSE
          UPDATE tenant_subscriptions
          SET status = 'active',
              ends_at = NOW() + INTERVAL '100 years',
              grace_ends_at = NOW() + INTERVAL '100 years',
              updated_at = NOW()
          WHERE tenant_id = 'zs';
        END IF;
      END $$;
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op
  },
};
