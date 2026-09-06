import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // Demote any tenant user mistakenly assigned 'super_admin' to 'admin'
    // 'super_admin' is strictly reserved for the root platform account ('default' or 'dev-tenant')
    await sql`
      UPDATE users 
      SET role = 'admin'
      WHERE role = 'super_admin'
        AND tenant_id IS NOT NULL 
        AND tenant_id NOT IN ('default', 'dev-tenant');
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op: irreversible security isolation sanitization
  },
};
