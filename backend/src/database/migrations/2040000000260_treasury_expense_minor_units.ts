import { sql, type Kysely } from 'kysely';

/**
 * Preserve one-fils in the existing cash expense and internal transfer sources.
 * Existing values remain untouched; widen integer range preservation only.
 * Migrations 256 and 259 already widen linked treasury/GL destinations.
 */
const columns: Array<[string, string]> = [
  ['expenses', 'amount'],
  ['treasury_transfers', 'amount'],
];

export async function up(db: Kysely<any>): Promise<void> {
  for (const [table, column] of columns) {
    const { rows } = await sql<{ data_type: string; numeric_precision: number | null; numeric_scale: number | null }>`
      SELECT data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}
    `.execute(db);
    if (rows.length !== 1) throw new Error(`Missing treasury monetary source column ${table}.${column}`);
    const info = rows[0];
    if (info.data_type !== 'numeric' || info.numeric_scale == null || info.numeric_precision == null) {
      throw new Error(`Unsafe treasury monetary type ${table}.${column}`);
    }
    if (Number(info.numeric_scale) >= 3) continue;
    const integerDigits = Number(info.numeric_precision) - Number(info.numeric_scale);
    // SQL identifiers are from the fixed internal allowlist, never request data.
    await sql.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE numeric(${integerDigits + 3},3)`).execute(db);
  }
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Do not truncate posted three-digit KWD/OMR source values on downgrade.
}

export const migration = { up, down };
