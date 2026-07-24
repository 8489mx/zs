import { Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    await db.schema
      .createTable('delivery_representatives')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(50)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(50)', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('phone', 'varchar(50)')
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .execute();

    await db.schema
      .alterTable('sales')
      .addColumn('delivery_rep_id', 'integer')
      .addColumn('delivery_status', 'varchar(30)')
      .addColumn('collection_status', 'varchar(30)')
      .addColumn('settled_at', 'timestamp')
      .addColumn('settled_by', 'integer')
      .execute();

    await db.schema
      .alterTable('held_sales')
      .addColumn('delivery_rep_id', 'integer')
      .addColumn('collection_status', 'varchar(30)')
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema
      .alterTable('sales')
      .dropColumn('delivery_rep_id')
      .dropColumn('delivery_status')
      .dropColumn('collection_status')
      .dropColumn('settled_at')
      .dropColumn('settled_by')
      .execute();

    await db.schema
      .alterTable('held_sales')
      .dropColumn('delivery_rep_id')
      .dropColumn('collection_status')
      .execute();

    await db.schema.dropTable('delivery_representatives').execute();
  }
};
