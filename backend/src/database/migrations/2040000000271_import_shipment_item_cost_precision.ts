import { sql, type Kysely } from 'kysely';

/**
 * Import shipment item cost precision (INV-LANDED-COST-STORAGE-PRECISION):
 * without this, Postgres silently rounds the landed-cost engine's
 * 4-decimal unit costs and overhead allocations back to 2dp at insert
 * time -- exactly the failure 0263 fixed for GRNI, 0264 for treasury,
 * 0265 for payroll, and 0266 for EOS. The breakdown engine outputs
 * landedCostEgp and unitOverheadEgp at 4 decimals, and the late-expense
 * path adds 6-decimal increments to the stored column; both were cut
 * to cents by numeric(10, 2) on write, and the inventory unit-cost
 * reader then built WAC from the already-truncated value.
 *
 * Target is numeric(15, 4) for both columns: it preserves the engine's
 * 4-decimal output exactly and matches the sibling
 * unit_landed_cost_egp column (NUMERIC(15, 4)). Widening only --
 * existing values are untouched and integer capacity grows.
 * Rollback deliberately NEVER truncates posted four-decimal balances.
 * Follows the 0263/0264/0265/0266 information_schema pattern.
 *
 * Deliberately NOT widened here: factory_unit_price_usd (a stored
 * foreign unit price, its own decision, not a computed cost),
 * estimated_landed_cost_egp and unit_landed_cost_egp (already
 * NUMERIC(15, 4)).
 */
const columns: Array<[string, string]> = [
  ['import_shipment_items', 'allocated_overhead_egp'],
  ['import_shipment_items', 'landed_cost_egp'],
];

export async function up(db: Kysely<any>): Promise<void> {
  for (const [table, column] of columns) {
    const { rows } = await sql<{ data_type: string; numeric_precision: number | null; numeric_scale: number | null }>`
      SELECT data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}
    `.execute(db);
    if (!rows.length) continue; // Legacy optional schema tables are absent on some migrations.
    const info = rows[0];
    if (info.data_type !== 'numeric' || info.numeric_scale === null || info.numeric_precision === null) {
      throw new Error(`Currency precision migration requires a constrained numeric column: ${table}.${column}`);
    }
    if (Number(info.numeric_scale) >= 4) continue;
    // Names are a fixed internal allowlist; no tenant-controlled SQL identifiers.
    await sql.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE numeric(15, 4)`).execute(db);
  }
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Never destroy 0.0001 posted data by narrowing numeric precision on rollback.
}

export const migration = { up, down };
