import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // 0. Pre-Migration Reconciliation Snapshot (Row Counts & Financial Totals)
    // =========================================================================
    await sql`
      CREATE TEMP TABLE IF NOT EXISTS _pre_recon_subcontracts AS
        SELECT tenant_id, COUNT(*)::bigint AS row_count, COALESCE(SUM(total_amount), 0)::numeric(15,3) AS total_val
        FROM contracting_subcontracts
        GROUP BY tenant_id;

      CREATE TEMP TABLE IF NOT EXISTS _pre_recon_invoices AS
        SELECT tenant_id, COUNT(*)::bigint AS row_count, COALESCE(SUM(net_payable), 0)::numeric(15,3) AS total_val
        FROM contracting_invoices
        GROUP BY tenant_id;
    `.execute(db);

    // =========================================================================
    // 1. Backfill legacy suppliers referenced as subcontractors into contracting_subcontractors
    // =========================================================================
    await sql`
      DO $$
      DECLARE
        r RECORD;
        v_new_id BIGINT;
      BEGIN
        -- Find all suppliers referenced in contracting_subcontracts or contracting_invoices
        FOR r IN
          SELECT DISTINCT s.tenant_id, s.id AS supplier_id, s.name, coalesce(s.phone, '') AS phone
          FROM suppliers s
          WHERE (
            EXISTS (SELECT 1 FROM contracting_subcontracts sc WHERE sc.tenant_id = s.tenant_id AND sc.subcontractor_id = s.id)
            OR EXISTS (SELECT 1 FROM contracting_invoices ci WHERE ci.tenant_id = s.tenant_id AND ci.subcontractor_id = s.id)
          )
        LOOP
          -- Check if an entry already exists in contracting_subcontractor_id_map
          IF NOT EXISTS (
            SELECT 1 FROM contracting_subcontractor_id_map
            WHERE tenant_id = r.tenant_id AND legacy_supplier_id = r.supplier_id
          ) THEN
            -- Check if a subcontractor with the same name already exists in this tenant
            SELECT id INTO v_new_id
            FROM contracting_subcontractors
            WHERE tenant_id = r.tenant_id AND name = r.name
            LIMIT 1;

            -- If not found, insert a new subcontractor
            IF v_new_id IS NULL THEN
              INSERT INTO contracting_subcontractors (
                tenant_id, name, phone, status, trade_specialty, notes, created_at, updated_at
              ) VALUES (
                r.tenant_id,
                r.name,
                r.phone,
                'active',
                'مقاول باطن مرحل',
                'تم الترحيل آلياً من جدول الموردين (المرحلة صفر)',
                NOW(),
                NOW()
              )
              RETURNING id INTO v_new_id;
            END IF;

            -- Record mapping
            INSERT INTO contracting_subcontractor_id_map (
              tenant_id, legacy_supplier_id, new_subcontractor_id, migrated_at
            ) VALUES (
              r.tenant_id, r.supplier_id, v_new_id, NOW()
            )
            ON CONFLICT (tenant_id, legacy_supplier_id) DO NOTHING;
          END IF;
        END LOOP;
      END $$;
    `.execute(db);

    // =========================================================================
    // 2. Perform actual ID redirection on contracting_subcontracts & contracting_invoices
    // =========================================================================
    await sql`
      -- Update contracting_subcontracts
      UPDATE contracting_subcontracts sc
      SET subcontractor_id = m.new_subcontractor_id
      FROM contracting_subcontractor_id_map m
      WHERE m.tenant_id = sc.tenant_id
        AND m.legacy_supplier_id = sc.subcontractor_id
        AND sc.subcontractor_id != m.new_subcontractor_id;

      -- Update contracting_invoices
      UPDATE contracting_invoices ci
      SET subcontractor_id = m.new_subcontractor_id
      FROM contracting_subcontractor_id_map m
      WHERE m.tenant_id = ci.tenant_id
        AND m.legacy_supplier_id = ci.subcontractor_id
        AND ci.subcontractor_id != m.new_subcontractor_id;
    `.execute(db);

    // =========================================================================
    // 3. Post-Migration Reconciliation Assertion (Zero Row Loss & Zero Value Drift)
    // =========================================================================
    await sql`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        -- Verify subcontracts reconciliation
        FOR r IN
          SELECT
            p.tenant_id,
            p.row_count AS pre_rows,
            COALESCE(c.post_rows, 0) AS post_rows,
            p.total_val AS pre_val,
            COALESCE(c.post_val, 0) AS post_val
          FROM _pre_recon_subcontracts p
          LEFT JOIN (
            SELECT tenant_id, COUNT(*)::bigint AS post_rows, COALESCE(SUM(total_amount), 0)::numeric(15,3) AS post_val
            FROM contracting_subcontracts
            GROUP BY tenant_id
          ) c ON p.tenant_id = c.tenant_id
          WHERE p.row_count != COALESCE(c.post_rows, 0) OR p.total_val != COALESCE(c.post_val, 0)
        LOOP
          RAISE EXCEPTION 'RECONCILIATION FAILURE [contracting_subcontracts] in tenant %: pre_rows=%, post_rows=%, pre_val=%, post_val=%',
            r.tenant_id, r.pre_rows, r.post_rows, r.pre_val, r.post_val;
        END LOOP;

        -- Verify invoices reconciliation
        FOR r IN
          SELECT
            p.tenant_id,
            p.row_count AS pre_rows,
            COALESCE(c.post_rows, 0) AS post_rows,
            p.total_val AS pre_val,
            COALESCE(c.post_val, 0) AS post_val
          FROM _pre_recon_invoices p
          LEFT JOIN (
            SELECT tenant_id, COUNT(*)::bigint AS post_rows, COALESCE(SUM(net_payable), 0)::numeric(15,3) AS post_val
            FROM contracting_invoices
            GROUP BY tenant_id
          ) c ON p.tenant_id = c.tenant_id
          WHERE p.row_count != COALESCE(c.post_rows, 0) OR p.total_val != COALESCE(c.post_val, 0)
        LOOP
          RAISE EXCEPTION 'RECONCILIATION FAILURE [contracting_invoices] in tenant %: pre_rows=%, post_rows=%, pre_val=%, post_val=%',
            r.tenant_id, r.pre_rows, r.post_rows, r.pre_val, r.post_val;
        END LOOP;

        DROP TABLE IF EXISTS _pre_recon_subcontracts;
        DROP TABLE IF EXISTS _pre_recon_invoices;
      END $$;
    `.execute(db);

    // =========================================================================
    // 4. Strict Constraint Validation (Loud Failure, No Error Swallowing)
    // =========================================================================
    await sql`
      ALTER TABLE contracting_subcontracts
        VALIDATE CONSTRAINT fk_subcontracts_subcontractor_tenant;

      ALTER TABLE contracting_invoices
        VALIDATE CONSTRAINT fk_invoices_subcontractor_tenant;

      ALTER TABLE contracting_invoices
        VALIDATE CONSTRAINT fk_invoices_subcontract_tenant;

      ALTER TABLE contracting_ipc_deductions
        VALIDATE CONSTRAINT fk_ipc_deductions_invoice_tenant;

      ALTER TABLE contracting_subcontractor_backcharges
        VALIDATE CONSTRAINT fk_backcharges_subcontractor_tenant;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    // Revert redirected IDs using mapping table
    await sql`
      UPDATE contracting_subcontracts sc
      SET subcontractor_id = m.legacy_supplier_id
      FROM contracting_subcontractor_id_map m
      WHERE m.tenant_id = sc.tenant_id AND m.new_subcontractor_id = sc.subcontractor_id;

      UPDATE contracting_invoices ci
      SET subcontractor_id = m.legacy_supplier_id
      FROM contracting_subcontractor_id_map m
      WHERE m.tenant_id = ci.tenant_id AND m.new_subcontractor_id = ci.subcontractor_id;
    `.execute(db);
  },
};
