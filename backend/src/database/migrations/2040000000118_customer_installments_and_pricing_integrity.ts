import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Unique index on customer_installment_plans(tenant_id, plan_number)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_installment_plans_tenant_number_uniq
      ON customer_installment_plans (tenant_id, plan_number);
    `.execute(db);

    // 2. Unique index on customer_installments(tenant_id, plan_id, installment_number)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_installments_tenant_plan_num_uniq
      ON customer_installments (tenant_id, plan_id, installment_number);
    `.execute(db);

    // 3. Composite index on price_change_runs for fast lookup of latest applied run
    await sql`
      CREATE INDEX IF NOT EXISTS idx_price_change_runs_tenant_status_id
      ON price_change_runs (tenant_id, status, id DESC);
    `.execute(db);

    // 4. Composite index on customer_payments for fast lookup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_payments_tenant_cust_created
      ON customer_payments (tenant_id, customer_id, created_at DESC);
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_customer_payments_tenant_cust_created;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_price_change_runs_tenant_status_id;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_customer_installments_tenant_plan_num_uniq;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_customer_installment_plans_tenant_number_uniq;`.execute(db);
  },
};
