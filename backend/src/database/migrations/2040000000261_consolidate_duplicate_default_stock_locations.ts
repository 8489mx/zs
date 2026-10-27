import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

/**
 * Migration 2040000000261:
 * Consolidates duplicate 'المخزن الرئيسي' locations created by legacy Excel imports
 * into the primary branch stock location ('رصيد الفرع الرئيسي').
 *
 * Compatibility Invariant:
 * Idempotent follower for 2040000000258_consolidate_duplicate_default_stock_locations.
 * Preserves database upgrade compatibility across environments that already executed
 * 258 or upgraded via linear sequences reaching 261.
 *
 * Invariant (Rule 13 AGENTS.md):
 * Preserves exact stock quantities across product_location_stock before and after consolidation.
 */
export async function up(db: Kysely<Database>): Promise<void> {
  await sql`
    DO $$
    DECLARE
      rec RECORD;
      v_dup_id BIGINT;
      v_prim_id BIGINT;
      v_stock_before NUMERIC;
      v_stock_after NUMERIC;
    BEGIN
      -- Snapshot total stock before changes
      SELECT COALESCE(SUM(qty), 0) INTO v_stock_before FROM product_location_stock;

      -- Iterate over duplicate locations generated alongside primary branch stock
      FOR rec IN
        SELECT 
          dup.id AS dup_id,
          dup.tenant_id,
          prim.id AS prim_id
        FROM stock_locations dup
        JOIN stock_locations prim 
          ON dup.tenant_id = prim.tenant_id 
         AND dup.id != prim.id
         AND prim.is_active = TRUE
         AND (prim.location_type = 'branch_stock' OR prim.name LIKE 'رصيد الفرع%')
         AND (dup.branch_id = prim.branch_id OR dup.branch_id IS NULL)
        WHERE dup.is_active = TRUE
          AND dup.name IN ('المخزن الرئيسي', 'المستودع الرئيسي')
          AND dup.location_type = 'internal_warehouse'
      LOOP
        v_dup_id := rec.dup_id;
        v_prim_id := rec.prim_id;

        -- 1. Consolidate product_location_stock:
        -- If product already exists in primary location: combine quantities and remove duplicate row
        UPDATE product_location_stock prim_st
        SET qty = prim_st.qty + dup_st.qty,
            reserved_qty = COALESCE(prim_st.reserved_qty, 0) + COALESCE(dup_st.reserved_qty, 0)
        FROM product_location_stock dup_st
        WHERE dup_st.location_id = v_dup_id
          AND prim_st.location_id = v_prim_id
          AND prim_st.product_id = dup_st.product_id
          AND prim_st.tenant_id = rec.tenant_id;

        DELETE FROM product_location_stock
        WHERE location_id = v_dup_id
          AND product_id IN (
            SELECT product_id FROM product_location_stock WHERE location_id = v_prim_id AND tenant_id = rec.tenant_id
          );

        -- For products that only exist in duplicate location: reassign location_id to primary
        UPDATE product_location_stock
        SET location_id = v_prim_id
        WHERE location_id = v_dup_id;

        -- 2. Redirect references in other tables
        UPDATE stock_movements SET location_id = v_prim_id WHERE location_id = v_dup_id;
        UPDATE purchases SET location_id = v_prim_id WHERE location_id = v_dup_id;
        UPDATE sales SET location_id = v_prim_id WHERE location_id = v_dup_id;
        UPDATE branches SET default_stock_location_id = v_prim_id WHERE default_stock_location_id = v_dup_id;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'warehouse_location_id') THEN
          UPDATE sales_orders SET warehouse_location_id = v_prim_id WHERE warehouse_location_id = v_dup_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_ledger' AND column_name = 'location_id') THEN
          UPDATE customer_ledger SET location_id = v_prim_id WHERE location_id = v_dup_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_ledger' AND column_name = 'location_id') THEN
          UPDATE supplier_ledger SET location_id = v_prim_id WHERE location_id = v_dup_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'damaged_stock_records' AND column_name = 'location_id') THEN
          UPDATE damaged_stock_records SET location_id = v_prim_id WHERE location_id = v_dup_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_count_sessions' AND column_name = 'location_id') THEN
          UPDATE stock_count_sessions SET location_id = v_prim_id WHERE location_id = v_dup_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_bin_locations' AND column_name = 'location_id') THEN
          UPDATE warehouse_bin_locations SET location_id = v_prim_id WHERE location_id = v_dup_id;
        END IF;

        -- 3. Deactivate the duplicate location and mark it consolidated
        UPDATE stock_locations
        SET is_active = FALSE,
            name = name || ' (مدمج في رصيد الفرع)'
        WHERE id = v_dup_id;

      END LOOP;

      -- Assert zero row-loss / sum-loss invariant
      SELECT COALESCE(SUM(qty), 0) INTO v_stock_after FROM product_location_stock;
      IF v_stock_before <> v_stock_after THEN
        RAISE EXCEPTION 'Stock reconciliation mismatch in migration 258: before=%, after=%', v_stock_before, v_stock_after;
      END IF;

    END $$;
  `.execute(db);
}

export async function down(_db: Kysely<Database>): Promise<void> {
  // Irreversible consolidation of duplicate locations
}
