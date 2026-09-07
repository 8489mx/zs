import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Add phone column to users table if not exists
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NULL;
    `.execute(db);

    // 2. Create index on phone for fast lookup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL AND phone <> '';
    `.execute(db);

    // 3. Create composite index on (tenant_id, phone)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_phone ON users (tenant_id, phone) WHERE phone IS NOT NULL AND phone <> '';
    `.execute(db);

    // 4. Backfill owner phone for primary admin user where available from tenants table
    await sql`
      UPDATE users u
      SET phone = t.owner_phone
      FROM tenants t
      WHERE u.tenant_id = t.id
        AND u.id = (
          SELECT u2.id FROM users u2 
          WHERE u2.tenant_id = t.id 
            AND u2.role IN ('super_admin', 'admin') 
          ORDER BY CASE WHEN u2.role = 'super_admin' THEN 1 ELSE 2 END, u2.id ASC 
          LIMIT 1
        )
        AND (u.phone IS NULL OR u.phone = '')
        AND t.owner_phone IS NOT NULL
        AND t.owner_phone <> '';
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_users_tenant_phone;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_users_phone;`.execute(db);
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS phone;`.execute(db);
  },
};
