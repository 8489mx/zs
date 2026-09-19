import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // 1. Resolve Subcontractor Split-Brain Identity
    // Drop legacy foreign keys to 'suppliers' and re-point to 'contracting_subcontractors'
    // =========================================================================
    await sql`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        -- Find and drop any existing FK constraint on subcontractor_id in contracting_subcontracts
        FOR r IN (
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'contracting_subcontracts'
            AND kcu.column_name = 'subcontractor_id'
        ) LOOP
          EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;

        -- Find and drop any existing FK constraint on subcontractor_id in contracting_invoices
        FOR r IN (
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'contracting_invoices'
            AND kcu.column_name = 'subcontractor_id'
        ) LOOP
          EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `.execute(db);

    // Add clean, explicit foreign key constraints to contracting_subcontractors (NOT VALID to allow data backfill in 102)
    await sql`
      ALTER TABLE contracting_subcontracts
        ADD CONSTRAINT fk_subcontracts_subcontractor
        FOREIGN KEY (subcontractor_id) REFERENCES contracting_subcontractors(id) ON DELETE CASCADE NOT VALID;
    `.execute(db);

    await sql`
      ALTER TABLE contracting_invoices
        ADD CONSTRAINT fk_invoices_subcontractor
        FOREIGN KEY (subcontractor_id) REFERENCES contracting_subcontractors(id) ON DELETE SET NULL NOT VALID;
    `.execute(db);

    // =========================================================================
    // 2. Expand contracting_subcontracts: Add Missing Contractual Terms & Schema Columns
    // =========================================================================
    await sql`
      ALTER TABLE contracting_subcontracts
        ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'supply_and_apply',
        ADD COLUMN IF NOT EXISTS advance_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS advance_recovery_start_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
        ADD COLUMN IF NOT EXISTS advance_recovery_end_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
        ADD COLUMN IF NOT EXISTS retention_limit_pct NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        ADD COLUMN IF NOT EXISTS penalty_per_day NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS ld_cap_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
        ADD COLUMN IF NOT EXISTS liability_cap_amount NUMERIC(15, 3) NULL,
        ADD COLUMN IF NOT EXISTS wht_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS social_insurance_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_linkage_mode TEXT NOT NULL DEFAULT 'independent',
        ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER NOT NULL DEFAULT 30,
        ADD COLUMN IF NOT EXISTS tail_reserve_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
        ADD COLUMN IF NOT EXISTS wastage_allowance_pct NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        ADD COLUMN IF NOT EXISTS mos_admissible_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mos_cap_pct NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
        ADD COLUMN IF NOT EXISTS assignment_permitted BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS dlp_months INTEGER NOT NULL DEFAULT 12,
        ADD COLUMN IF NOT EXISTS revised_contract_sum NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS revised_completion_date DATE NULL,
        ADD COLUMN IF NOT EXISTS approved_eot_days INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS baseline_frozen_at TIMESTAMPTZ NULL;
    `.execute(db);

    // =========================================================================
    // 3. Decompose contracting_invoices: Dismantle the other_deductions Black Box
    // =========================================================================
    await sql`
      ALTER TABLE contracting_invoices
        ADD COLUMN IF NOT EXISTS gross_work_done_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS escalation_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mos_added_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mos_released_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mos_balance_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS backcharge_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS ld_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS material_excess_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS shared_resource_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS direct_payment_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS carried_forward_debit_in NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS carried_forward_debit_out NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS taxable_base_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS wht_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS social_insurance_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS certified_amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS certification_due_date DATE NULL,
        ADD COLUMN IF NOT EXISTS payment_due_date DATE NULL,
        ADD COLUMN IF NOT EXISTS linked_client_invoice_id BIGINT NULL REFERENCES contracting_invoices(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS calc_engine_version TEXT NOT NULL DEFAULT 'v2_phased',
        ADD COLUMN IF NOT EXISTS calc_inputs_snapshot JSONB NULL;
    `.execute(db);

    // =========================================================================
    // 4. Create Detailed Itemized Deductions Table (contracting_ipc_deductions)
    // =========================================================================
    await sql`
      CREATE TABLE IF NOT EXISTS contracting_ipc_deductions (
        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT '',
        invoice_id BIGINT NOT NULL REFERENCES contracting_invoices(id) ON DELETE CASCADE,
        deduction_type TEXT NOT NULL,
        source_table TEXT NULL,
        source_id BIGINT NULL,
        amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
        vat_treatment TEXT NOT NULL DEFAULT 'none',
        debit_note_ref TEXT NULL,
        notice_ref TEXT NULL,
        approved_by TEXT NULL,
        approved_at TIMESTAMPTZ NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_contracting_ipc_deductions_inv 
      ON contracting_ipc_deductions (tenant_id, invoice_id, deduction_type);
    `.execute(db);

    // =========================================================================
    // 5. Expand contracting_invoice_items: Granular Stages & Quality/WIR Traceability
    // =========================================================================
    await sql`
      ALTER TABLE contracting_invoice_items
        ADD COLUMN IF NOT EXISTS wir_id BIGINT NULL REFERENCES contracting_inspection_requests(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS claimed_qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS certified_qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS variance_reason TEXT NULL,
        ADD COLUMN IF NOT EXISTS progress_stage TEXT NULL,
        ADD COLUMN IF NOT EXISTS stage_weight_pct NUMERIC(5, 2) NULL,
        ADD COLUMN IF NOT EXISTS change_order_id BIGINT NULL REFERENCES contracting_change_orders(id) ON DELETE SET NULL;
    `.execute(db);

    // =========================================================================
    // 6. Direct Subcontractor Reference in Backcharges Table
    // =========================================================================
    await sql`
      ALTER TABLE contracting_subcontractor_backcharges
        ADD COLUMN IF NOT EXISTS subcontractor_id BIGINT NULL REFERENCES contracting_subcontractors(id) ON DELETE SET NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_contracting_backcharges_subcontractor
      ON contracting_subcontractor_backcharges (tenant_id, subcontractor_id, status);
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP TABLE IF EXISTS contracting_ipc_deductions CASCADE;`.execute(db);
  },
};
