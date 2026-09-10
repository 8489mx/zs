import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // CRITICAL: NEVER establish platform root tenant 'zs' in desktop / self-contained / portable mode!
    // In desktop mode, client store data belongs to tenant_id = 'default'.
    const isDesktop = process.env.APP_MODE === 'SELF_CONTAINED' 
      || process.env.PORTABLE_MODE === 'true' 
      || process.env.IS_ELECTRON === 'true';

    if (isDesktop) {
      console.log('[Migration 74] Skipped in desktop/self-contained mode to protect client store data.');
      return;
    }

    // 1. Ensure platform root tenant 'zs' exists and is active
    await sql`
      DO $$
      BEGIN
        -- If another tenant accidentally took slug 'zs', rename its slug to avoid unique violation
        UPDATE tenants 
        SET slug = CONCAT('tenant-', id) 
        WHERE slug = 'zs' AND id != 'zs';

        IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'zs') THEN
          INSERT INTO tenants (
            id, 
            slug, 
            business_name, 
            owner_name, 
            owner_phone, 
            owner_email, 
            status, 
            trial_starts_at, 
            trial_ends_at, 
            activated_at
          ) VALUES (
            'zs', 
            'zs', 
            'منصة Z-Systems المركزية', 
            'محمود زكريا', 
            '0000000000', 
            'admin@zsystems.io', 
            'active', 
            NOW(), 
            NOW() + INTERVAL '100 years', 
            NOW()
          );
        ELSE
          UPDATE tenants 
          SET status = 'active', 
              business_name = 'منصة Z-Systems المركزية' 
          WHERE id = 'zs';
        END IF;
      END $$;
    `.execute(db);

    // 2. Assign user 'zs' to the platform root tenant 'zs' with role 'super_admin'
    await sql`
      UPDATE users 
      SET tenant_id = 'zs', 
          account_id = 'zs', 
          role = 'super_admin'
      WHERE LOWER(TRIM(username)) = 'zs';
    `.execute(db);

    // 3. Strictly demote any user assigned 'super_admin' in any tenant other than the platform root tenants
    // Only tenants ('zs', 'default', 'dev-tenant') are authorized to host 'super_admin' accounts
    await sql`
      UPDATE users 
      SET role = 'admin'
      WHERE role = 'super_admin'
        AND tenant_id NOT IN ('zs', 'default', 'dev-tenant');
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op: security and isolation boundaries are non-reversible
  },
};
