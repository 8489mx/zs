import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // 1. Add payment_category & status to contracting_subcontractor_payments
    //    Enables Cumulative Gateway G1 Tracking & Ledger Category Distinctions
    // =========================================================================
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'contracting_subcontractor_payments' AND column_name = 'payment_category'
        ) THEN
          ALTER TABLE contracting_subcontractor_payments
            ADD COLUMN payment_category TEXT NOT NULL DEFAULT 'progress';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'contracting_subcontractor_payments' AND column_name = 'status'
        ) THEN
          ALTER TABLE contracting_subcontractor_payments
            ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sub_payments_category') THEN
          ALTER TABLE contracting_subcontractor_payments
            ADD CONSTRAINT chk_sub_payments_category
            CHECK (payment_category IN ('advance', 'progress', 'retention', 'operational_advance'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sub_payments_status') THEN
          ALTER TABLE contracting_subcontractor_payments
            ADD CONSTRAINT chk_sub_payments_status
            CHECK (status IN ('completed', 'cancelled'));
        END IF;
      END $$;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_contracting_sub_payments_tenant_cat
      ON contracting_subcontractor_payments (tenant_id, subcontract_id, payment_category, status);
    `.execute(db);

    // =========================================================================
    // 2. Add Composite UNIQUE (tenant_id, id) on contracting_projects
    // =========================================================================
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_contracting_projects_tenant_id'
        ) THEN
          ALTER TABLE contracting_projects
            ADD CONSTRAINT uq_contracting_projects_tenant_id UNIQUE (tenant_id, id);
        END IF;
      END $$;
    `.execute(db);

    // =========================================================================
    // 3. Rebuild fk_guarantees_project_tenant as a strict composite tenant FK
    // =========================================================================
    await sql`
      ALTER TABLE contracting_guarantees
        DROP CONSTRAINT IF EXISTS fk_guarantees_project_tenant;

      ALTER TABLE contracting_guarantees
        ADD CONSTRAINT fk_guarantees_project_tenant
        FOREIGN KEY (tenant_id, project_id)
        REFERENCES contracting_projects(tenant_id, id)
        ON DELETE RESTRICT;
    `.execute(db);

    // =========================================================================
    // 4. Validate the 3 Deferred Constraints from Phase 0
    // =========================================================================
    await sql`
      DO $$
      BEGIN
        -- Validate fk_invoices_subcontract_tenant if not already validated
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_invoices_subcontract_tenant' AND convalidated = false
        ) THEN
          ALTER TABLE contracting_invoices VALIDATE CONSTRAINT fk_invoices_subcontract_tenant;
        END IF;

        -- Validate fk_ipc_deductions_invoice_tenant if not already validated
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_ipc_deductions_invoice_tenant' AND convalidated = false
        ) THEN
          ALTER TABLE contracting_ipc_deductions VALIDATE CONSTRAINT fk_ipc_deductions_invoice_tenant;
        END IF;

        -- Validate fk_backcharges_subcontractor_tenant if not already validated
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_backcharges_subcontractor_tenant' AND convalidated = false
        ) THEN
          ALTER TABLE contracting_subcontractor_backcharges VALIDATE CONSTRAINT fk_backcharges_subcontractor_tenant;
        END IF;
      END $$;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE contracting_guarantees
        DROP CONSTRAINT IF EXISTS fk_guarantees_project_tenant;

      ALTER TABLE contracting_guarantees
        ADD CONSTRAINT fk_guarantees_project_tenant
        FOREIGN KEY (project_id)
        REFERENCES contracting_projects(id)
        ON DELETE RESTRICT;

      ALTER TABLE contracting_projects
        DROP CONSTRAINT IF EXISTS uq_contracting_projects_tenant_id;

      DROP INDEX IF EXISTS idx_contracting_sub_payments_tenant_cat;

      ALTER TABLE contracting_subcontractor_payments
        DROP CONSTRAINT IF EXISTS chk_sub_payments_status,
        DROP CONSTRAINT IF EXISTS chk_sub_payments_category,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS payment_category;
    `.execute(db);
  },
};
