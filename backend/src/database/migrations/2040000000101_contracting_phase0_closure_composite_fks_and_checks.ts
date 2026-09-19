import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // 1. Permanent Subcontractor ID Mapping Table (Audit & Data Migration Log)
    // =========================================================================
    await sql`
      CREATE TABLE IF NOT EXISTS contracting_subcontractor_id_map (
        tenant_id TEXT NOT NULL,
        legacy_supplier_id BIGINT NOT NULL,
        new_subcontractor_id BIGINT NOT NULL,
        migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tenant_id, legacy_supplier_id)
      );
    `.execute(db);

    // =========================================================================
    // 2. Ensure Composite Unique Constraints on Referenced Tables for Tenant Isolation
    // =========================================================================
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_contracting_subcontractors_tenant_id'
        ) THEN
          ALTER TABLE contracting_subcontractors
            ADD CONSTRAINT uq_contracting_subcontractors_tenant_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_contracting_subcontracts_tenant_id'
        ) THEN
          ALTER TABLE contracting_subcontracts
            ADD CONSTRAINT uq_contracting_subcontracts_tenant_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_contracting_invoices_tenant_id'
        ) THEN
          ALTER TABLE contracting_invoices
            ADD CONSTRAINT uq_contracting_invoices_tenant_id UNIQUE (tenant_id, id);
        END IF;
      END $$;
    `.execute(db);

    // =========================================================================
    // 3. Drop simple single-column FKs and replace with strict composite (tenant_id, id) FKs
    //    with ON DELETE RESTRICT (to preserve financial ledgers)
    // =========================================================================
    await sql`
      -- Drop previous simple foreign keys if they exist
      ALTER TABLE contracting_subcontracts
        DROP CONSTRAINT IF EXISTS fk_subcontracts_subcontractor;

      ALTER TABLE contracting_invoices
        DROP CONSTRAINT IF EXISTS fk_invoices_subcontractor,
        DROP CONSTRAINT IF EXISTS contracting_invoices_subcontract_id_fkey;

      ALTER TABLE contracting_ipc_deductions
        DROP CONSTRAINT IF EXISTS contracting_ipc_deductions_invoice_id_fkey;

      ALTER TABLE contracting_subcontractor_backcharges
        DROP CONSTRAINT IF EXISTS contracting_subcontractor_backcharges_subcontractor_id_fkey;

      -- Add strict composite tenant-scoped foreign keys with ON DELETE RESTRICT (NOT VALID before backfill in 102)
      ALTER TABLE contracting_subcontracts
        ADD CONSTRAINT fk_subcontracts_subcontractor_tenant
        FOREIGN KEY (tenant_id, subcontractor_id)
        REFERENCES contracting_subcontractors(tenant_id, id)
        ON DELETE RESTRICT NOT VALID;

      ALTER TABLE contracting_invoices
        ADD CONSTRAINT fk_invoices_subcontractor_tenant
        FOREIGN KEY (tenant_id, subcontractor_id)
        REFERENCES contracting_subcontractors(tenant_id, id)
        ON DELETE RESTRICT NOT VALID;

      ALTER TABLE contracting_invoices
        ADD CONSTRAINT fk_invoices_subcontract_tenant
        FOREIGN KEY (tenant_id, subcontract_id)
        REFERENCES contracting_subcontracts(tenant_id, id)
        ON DELETE RESTRICT NOT VALID;

      ALTER TABLE contracting_ipc_deductions
        ADD CONSTRAINT fk_ipc_deductions_invoice_tenant
        FOREIGN KEY (tenant_id, invoice_id)
        REFERENCES contracting_invoices(tenant_id, id)
        ON DELETE CASCADE;

      ALTER TABLE contracting_subcontractor_backcharges
        ADD CONSTRAINT fk_backcharges_subcontractor_tenant
        FOREIGN KEY (tenant_id, subcontractor_id)
        REFERENCES contracting_subcontractors(tenant_id, id)
        ON DELETE RESTRICT NOT VALID;
    `.execute(db);

    // =========================================================================
    // 4. Solid CHECK Constraints for Data Integrity & Type Enumerations
    // =========================================================================
    await sql`
      DO $$
      BEGIN
        -- Subcontracts CHECK constraints
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subcontracts_contract_type') THEN
          ALTER TABLE contracting_subcontracts
            ADD CONSTRAINT chk_subcontracts_contract_type
            CHECK (contract_type IN ('supply_and_apply', 'labor_only', 'supply_only', 'labor_plus_consumables'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subcontracts_payment_linkage') THEN
          ALTER TABLE contracting_subcontracts
            ADD CONSTRAINT chk_subcontracts_payment_linkage
            CHECK (payment_linkage_mode IN ('independent', 'pay_when_paid', 'pay_when_certified'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subcontracts_recovery_window') THEN
          ALTER TABLE contracting_subcontracts
            ADD CONSTRAINT chk_subcontracts_recovery_window
            CHECK (advance_recovery_end_pct > advance_recovery_start_pct);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subcontracts_percentages_valid') THEN
          ALTER TABLE contracting_subcontracts
            ADD CONSTRAINT chk_subcontracts_percentages_valid
            CHECK (
              advance_recovery_start_pct >= 0 AND advance_recovery_end_pct <= 100 AND
              advance_pct >= 0 AND advance_pct <= 100 AND
              retention_percent >= 0 AND retention_percent <= 100 AND
              retention_limit_pct >= 0 AND retention_limit_pct <= 100 AND
              ld_cap_pct >= 0 AND ld_cap_pct <= 100 AND
              total_amount >= 0 AND
              penalty_per_day >= 0
            );
        END IF;

        -- Invoices CHECK constraints
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_ipc_type') THEN
          ALTER TABLE contracting_invoices
            ADD CONSTRAINT chk_invoices_ipc_type
            CHECK (ipc_type IN ('client', 'subcontractor'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_amounts_non_negative') THEN
          ALTER TABLE contracting_invoices
            ADD CONSTRAINT chk_invoices_amounts_non_negative
            CHECK (
              net_payable >= 0 AND
              gross_work_done_amount >= 0 AND
              carried_forward_debit_in >= 0 AND
              carried_forward_debit_out >= 0
            );
        END IF;

        -- IPC Deductions CHECK constraints
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ipc_deductions_type') THEN
          ALTER TABLE contracting_ipc_deductions
            ADD CONSTRAINT chk_ipc_deductions_type
            CHECK (deduction_type IN (
              'backcharge', 'liquidated_damages', 'material_excess',
              'shared_resources', 'direct_labor_payment', 'social_insurance',
              'withholding_tax', 'other'
            ));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ipc_deductions_vat') THEN
          ALTER TABLE contracting_ipc_deductions
            ADD CONSTRAINT chk_ipc_deductions_vat
            CHECK (vat_treatment IN ('none', 'separate_debit_note', 'inclusive'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ipc_deductions_amount') THEN
          ALTER TABLE contracting_ipc_deductions
            ADD CONSTRAINT chk_ipc_deductions_amount
            CHECK (amount >= 0);
        END IF;
      END $$;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP TABLE IF EXISTS contracting_subcontractor_id_map CASCADE;`.execute(db);
  },
};
