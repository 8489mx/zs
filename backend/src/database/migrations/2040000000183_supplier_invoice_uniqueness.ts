import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // Disambiguate any pre-existing duplicate active supplier invoices prior to creating the unique index
    await sql`
      UPDATE purchases
      SET supplier_invoice_no = supplier_invoice_no || '-DUP-' || id::text
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY tenant_id, supplier_id, upper(regexp_replace(btrim(supplier_invoice_no), '[[:space:]]+', ' ', 'g'))
            ORDER BY created_at DESC, id DESC
          ) as rn
          FROM purchases
          WHERE supplier_invoice_no IS NOT NULL AND btrim(supplier_invoice_no) <> '' AND status <> 'cancelled'
        ) sub WHERE rn > 1
      )
    `.execute(db);

    // The earlier lookup index cannot prevent two concurrent bills with the same supplier reference.
    // Cancelled bills release the reference so a corrected replacement may be entered.
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_tenant_supplier_invoice_active
      ON purchases (tenant_id, supplier_id, upper(regexp_replace(btrim(supplier_invoice_no), '[[:space:]]+', ' ', 'g')))
      WHERE supplier_invoice_no IS NOT NULL AND btrim(supplier_invoice_no) <> '' AND status <> 'cancelled'`.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS uq_purchases_tenant_supplier_invoice_active`.execute(db);
  },
};
