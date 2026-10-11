import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Add ECR / POS payment terminal metadata columns to sales table
  await db.schema
    .alterTable('sales')
    .addColumn('terminal_id', 'varchar(64)')
    .addColumn('terminal_auth_code', 'varchar(64)')
    .addColumn('terminal_rrn', 'varchar(64)')
    .addColumn('card_scheme', 'varchar(32)')
    .addColumn('card_last_four', 'varchar(8)')
    .execute();

  // 2. Add card authorization columns to sale_payments table
  await db.schema
    .alterTable('sale_payments')
    .addColumn('terminal_id', 'varchar(64)')
    .addColumn('card_auth_code', 'varchar(64)')
    .addColumn('card_rrn', 'varchar(64)')
    .addColumn('card_scheme', 'varchar(32)')
    .addColumn('card_last_four', 'varchar(8)')
    .execute();

  // 3. Add index on terminal_auth_code and terminal_rrn for quick reconciliation
  await db.schema
    .createIndex('idx_sales_terminal_auth')
    .on('sales')
    .columns(['tenant_id', 'terminal_auth_code'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_sales_terminal_auth').ifExists().execute();

  await db.schema
    .alterTable('sale_payments')
    .dropColumn('card_last_four')
    .dropColumn('card_scheme')
    .dropColumn('card_rrn')
    .dropColumn('card_auth_code')
    .dropColumn('terminal_id')
    .execute();

  await db.schema
    .alterTable('sales')
    .dropColumn('card_last_four')
    .dropColumn('card_scheme')
    .dropColumn('terminal_rrn')
    .dropColumn('terminal_auth_code')
    .dropColumn('terminal_id')
    .execute();
}
