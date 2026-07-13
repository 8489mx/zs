import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('sales')
    .addColumn('tendered_amount', 'numeric(14, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('change_amount', 'numeric(14, 2)', (col) => col.notNull().defaultTo(0))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('sales')
    .dropColumn('tendered_amount')
    .dropColumn('change_amount')
    .execute();
}
