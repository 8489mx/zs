import { Kysely, sql } from 'kysely';

/** No legacy success is inferred from Arrived or from a note: both only require review. */
export const migration = {
  up: async (db: Kysely<unknown>): Promise<void> => {
    // This migration adds review records only. Preserve every old quantity/value/reference.
    await sql`
      CREATE TEMP TABLE import_inventory_before ON COMMIT DROP AS
      SELECT tenant_id, count(*) AS row_count, sum(qty) AS qty,
        sum(total_cost) AS total_cost,
        sum(hashtextextended(concat_ws('|', id, reference_type, reference_id, note), 0)::numeric) AS references_hash
      FROM stock_movements GROUP BY tenant_id
    `.execute(db);
    await sql`
      WITH legacy_movements AS (
        SELECT tenant_id,
          substring(note FROM '^شحنة استيراد #([0-9a-fA-F-]{36}) -') AS shipment_text
        FROM stock_movements
        WHERE import_receipt_id IS NULL
          AND (reference_type = 'import_shipment' OR movement_type = 'import_receipt')
      ), matched AS (
        SELECT DISTINCT s.tenant_id, s.id
        FROM import_shipments s JOIN legacy_movements m
          ON m.tenant_id = s.tenant_id AND lower(m.shipment_text) = s.id::text
      ), ambiguous_tenants AS (
        SELECT DISTINCT m.tenant_id FROM legacy_movements m
        WHERE NOT EXISTS (
          SELECT 1 FROM import_shipments s
          WHERE s.tenant_id = m.tenant_id AND s.id::text = lower(m.shipment_text)
        )
      )
      INSERT INTO import_inventory_receipts
        (tenant_id, shipment_id, state, review_reason, posted_at, created_by)
      SELECT s.tenant_id, s.id, 'legacy_review_required',
        CASE WHEN a.tenant_id IS NOT NULL THEN 'unmatched_legacy_movement'
          WHEN m.id IS NOT NULL THEN 'legacy_movement'
          ELSE 'legacy_arrived_without_verified_receipt' END,
        NULL, NULL
      FROM import_shipments s
      LEFT JOIN matched m ON m.tenant_id = s.tenant_id AND m.id = s.id
      LEFT JOIN ambiguous_tenants a ON a.tenant_id = s.tenant_id
      WHERE s.status = 'Arrived' OR m.id IS NOT NULL OR a.tenant_id IS NOT NULL
      ON CONFLICT (tenant_id, shipment_id) DO NOTHING
    `.execute(db);
    await sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM import_inventory_before b FULL JOIN (
            SELECT tenant_id, count(*) AS row_count, sum(qty) AS qty, sum(total_cost) AS total_cost,
              sum(hashtextextended(concat_ws('|', id, reference_type, reference_id, note), 0)::numeric) AS references_hash
            FROM stock_movements GROUP BY tenant_id
          ) a USING (tenant_id)
          WHERE b.row_count IS DISTINCT FROM a.row_count OR b.qty IS DISTINCT FROM a.qty
            OR b.total_cost IS DISTINCT FROM a.total_cost
            OR b.references_hash IS DISTINCT FROM a.references_hash
        ) THEN RAISE EXCEPTION 'Import receipt migration changed historical stock ledger'; END IF;
      END $$
    `.execute(db);
    await sql`ALTER TABLE import_inventory_receipts VALIDATE CONSTRAINT fk_import_receipt_shipment`.execute(db);
    await sql`ALTER TABLE stock_movements VALIDATE CONSTRAINT fk_stock_import_receipt`.execute(db);
    await sql`ALTER TABLE stock_movements VALIDATE CONSTRAINT ck_stock_import_receipt_reference`.execute(db);
    await sql`DROP TABLE import_inventory_before`.execute(db);
  },
  down: async (): Promise<void> => {
    throw new Error('Legacy review holds must be reconciled explicitly, never deleted by rollback.');
  },
};
