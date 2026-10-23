import { Kysely, sql } from 'kysely';

/** Cash drawer figures must never include bank/card/wallet payments. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE customer_payments
      ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20) NOT NULL DEFAULT 'cash';
    ALTER TABLE supplier_payments
      ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20) NOT NULL DEFAULT 'cash';
    ALTER TABLE supplier_payment_schedule_logs
      ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20) NOT NULL DEFAULT 'cash';
    ALTER TABLE treasury_transactions
      ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20) NOT NULL DEFAULT 'cash';
    ALTER TABLE customer_payments
      ADD CONSTRAINT customer_payments_channel_allowed
      CHECK (payment_channel IN ('cash','bank','card','wallet','instapay'));
    ALTER TABLE supplier_payments
      ADD CONSTRAINT supplier_payments_channel_allowed
      CHECK (payment_channel IN ('cash','bank','card','wallet','instapay'));
    ALTER TABLE supplier_payment_schedule_logs
      ADD CONSTRAINT schedule_logs_channel_allowed
      CHECK (payment_channel IN ('cash','bank','card','wallet','instapay'));
    ALTER TABLE treasury_transactions
      ADD CONSTRAINT treasury_transactions_channel_allowed
      CHECK (payment_channel IN ('cash','bank','card','wallet','instapay'));
  `.execute(db);
}
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE treasury_transactions DROP CONSTRAINT IF EXISTS treasury_transactions_channel_allowed;
    ALTER TABLE supplier_payment_schedule_logs DROP CONSTRAINT IF EXISTS schedule_logs_channel_allowed;
    ALTER TABLE supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_channel_allowed;
    ALTER TABLE customer_payments DROP CONSTRAINT IF EXISTS customer_payments_channel_allowed;
    ALTER TABLE treasury_transactions DROP COLUMN IF EXISTS payment_channel;
    ALTER TABLE supplier_payment_schedule_logs DROP COLUMN IF EXISTS payment_channel;
    ALTER TABLE supplier_payments DROP COLUMN IF EXISTS payment_channel;
    ALTER TABLE customer_payments DROP COLUMN IF EXISTS payment_channel;
  `.execute(db);
}
