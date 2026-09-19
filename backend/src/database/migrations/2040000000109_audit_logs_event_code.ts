import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // Stable machine-readable event code on audit logs.
    // Detection (fraud radar) previously matched on Arabic prose in `action`, so any
    // wording change silently blinded it. The code is the contract; the text stays human-facing.
    // =========================================================================
    await sql`
      ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS event_code TEXT NULL;
    `.execute(db);

    // Backfill historical rows so existing detections keep working after the switch.
    await sql`
      UPDATE audit_logs
      SET event_code = 'POS_CART_ITEM_REMOVED'
      WHERE event_code IS NULL AND action LIKE '%حذف عنصر من السلة%';
    `.execute(db);

    await sql`
      UPDATE audit_logs
      SET event_code = 'POS_DRAFT_SALE_CANCELLED'
      WHERE event_code IS NULL AND action LIKE '%إلغاء/حذف فاتورة%';
    `.execute(db);

    await sql`
      UPDATE audit_logs
      SET event_code = 'POS_DISCOUNT_OVERRIDE'
      WHERE event_code IS NULL AND action LIKE '%خصم%';
    `.execute(db);

    await sql`
      UPDATE audit_logs
      SET event_code = 'POS_SALE_RETURN'
      WHERE event_code IS NULL AND action LIKE '%مرتجع%';
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_code
        ON audit_logs (tenant_id, event_code, created_at)
        WHERE event_code IS NOT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_audit_logs_event_code;`.execute(db);
    await sql`ALTER TABLE audit_logs DROP COLUMN IF EXISTS event_code;`.execute(db);
  },
};
