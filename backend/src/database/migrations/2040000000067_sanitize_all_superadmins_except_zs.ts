import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // Demote any user mistakenly assigned 'super_admin' whose username is NOT 'zs' to 'admin'
    // 'super_admin' is strictly and exclusively reserved for the root system account ('zs')
    await sql`
      UPDATE users 
      SET role = 'admin'
      WHERE role = 'super_admin'
        AND LOWER(TRIM(username)) != 'zs';
    `.execute(db);
  },

  async down(_db: Kysely<unknown>): Promise<void> {
    // no-op: irreversible security isolation sanitization
  },
};
