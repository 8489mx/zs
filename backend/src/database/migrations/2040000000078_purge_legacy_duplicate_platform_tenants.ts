import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // CRITICAL: NEVER run duplicate platform tenant purging in desktop / self-contained / portable mode!
    // In desktop installations, client store data is stored under tenant_id = 'default'.
    const isDesktop = process.env.APP_MODE === 'SELF_CONTAINED' 
      || process.env.PORTABLE_MODE === 'true' 
      || process.env.IS_ELECTRON === 'true';

    if (isDesktop) {
      console.log('[Migration 78] Skipped in desktop/self-contained mode to protect client store data.');
      return;
    }

    await sql`
      DO $$
      DECLARE
        v_tenant_id TEXT;
        v_rec RECORD;
        v_pass INT;
        v_has_real_data BOOLEAN;
      BEGIN
        -- Identify and loop through legacy duplicate platform tenants ('default', 'zsystems', 'zsystems-main', etc.)
        -- Strictly PRESERVE the real platform tenant 'zs' and any legitimate tenants like 'elmohandis'
        FOR v_tenant_id IN 
          SELECT id FROM tenants 
          WHERE id != 'zs' 
            AND (
              id = 'default' 
              OR slug IN ('zsystems', 'zsystems-main', 'karimzakaria-demo')
              OR (business_name IN ('Z-Systems', 'Z Systems') AND id != 'zs')
            )
        LOOP
          -- CRITICAL SAFETY GUARD: If this tenant has actual customer products or sales, NEVER delete it!
          v_has_real_data := FALSE;
          BEGIN
            SELECT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant_id) INTO v_has_real_data;
          EXCEPTION WHEN OTHERS THEN
            v_has_real_data := FALSE;
          END;

          IF NOT v_has_real_data THEN
            BEGIN
              SELECT EXISTS (SELECT 1 FROM sales WHERE tenant_id = v_tenant_id) INTO v_has_real_data;
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END IF;

          IF v_has_real_data THEN
            RAISE NOTICE 'Skipping tenant % because it contains real customer data (products or sales)', v_tenant_id;
            CONTINUE;
          END IF;

          RAISE NOTICE 'Purging legacy duplicate tenant: %', v_tenant_id;

          -- 1. Multi-pass deletion of all records in tables having a 'tenant_id' column
          FOR v_pass IN 1..5 LOOP
            FOR v_rec IN 
              SELECT table_name 
              FROM information_schema.columns 
              WHERE column_name = 'tenant_id' 
                AND table_schema = 'public' 
                AND table_name != 'tenants'
            LOOP
              BEGIN
                EXECUTE format('DELETE FROM %I WHERE tenant_id = %L', v_rec.table_name, v_tenant_id);
              EXCEPTION WHEN OTHERS THEN
                -- Ignore FK constraint failures on intermediate passes
              END;
            END LOOP;
          END LOOP;

          -- 2. Clean user sessions and users tied to the legacy tenant (ensuring user 'zs' is never deleted)
          BEGIN
            DELETE FROM sessions WHERE tenant_id = v_tenant_id OR user_id IN (
              SELECT id FROM users WHERE tenant_id = v_tenant_id AND LOWER(TRIM(username)) != 'zs'
            );
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            DELETE FROM user_roles WHERE user_id IN (
              SELECT id FROM users WHERE tenant_id = v_tenant_id AND LOWER(TRIM(username)) != 'zs'
            );
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            DELETE FROM users WHERE tenant_id = v_tenant_id AND LOWER(TRIM(username)) != 'zs';
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          -- 3. Additional sweep across all tables with tenant_id to guarantee cleanliness
          FOR v_rec IN 
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'tenant_id' 
              AND table_schema = 'public' 
              AND table_name != 'tenants'
          LOOP
            BEGIN
              EXECUTE format('DELETE FROM %I WHERE tenant_id = %L', v_rec.table_name, v_tenant_id);
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END LOOP;

          -- 4. Delete the legacy tenant record itself
          DELETE FROM tenants WHERE id = v_tenant_id;
        END LOOP;
      END $$;
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op: legacy cleanup is permanent and non-reversible
  },
};
