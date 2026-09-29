import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000173: B2B Commercial Subscriptions & Recurring Contracts
 *
 * Implements recurring contracts, automated periodic invoicing cycles,
 * and subscription lifecycle state machine (draft, active, paused, expired, canceled).
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      CREATE TABLE IF NOT EXISTS commercial_subscriptions (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        contract_number VARCHAR(100) NOT NULL,
        customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
        next_billing_date DATE NOT NULL,
        auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
        recurring_amount NUMERIC(15, 4) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
        start_date DATE NOT NULL,
        end_date DATE NULL,
        notes TEXT NULL,
        last_generated_invoice_id BIGINT NULL,
        last_generated_at TIMESTAMPTZ NULL,
        invoices_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_subscriptions_tenant_contract UNIQUE (tenant_id, contract_number)
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status
      ON commercial_subscriptions (tenant_id, status);

      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_next_bill
      ON commercial_subscriptions (tenant_id, next_billing_date)
      WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS commercial_subscription_lines (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        subscription_id VARCHAR(64) NOT NULL REFERENCES commercial_subscriptions(id) ON DELETE CASCADE,
        product_id BIGINT NULL REFERENCES products(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
        unit_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
        total_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sub_lines_tenant_subscription
      ON commercial_subscription_lines (tenant_id, subscription_id);
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DROP TABLE IF EXISTS commercial_subscription_lines CASCADE;
      DROP TABLE IF EXISTS commercial_subscriptions CASCADE;
    `.execute(db);
  },
};
