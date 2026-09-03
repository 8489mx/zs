import { Kysely } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Add custom_domain column to tenants table
    await db.schema
      .alterTable('tenants')
      .addColumn('custom_domain', 'varchar(255)')
      .execute()
      .catch(() => undefined);

    // 2. Add unique index for custom_domain lookup
    await db.schema
      .createIndex('idx_tenants_custom_domain')
      .ifNotExists()
      .on('tenants')
      .column('custom_domain')
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropIndex('idx_tenants_custom_domain').ifExists().execute();
    await db.schema
      .alterTable('tenants')
      .dropColumn('custom_domain')
      .execute()
      .catch(() => undefined);
  },
};
