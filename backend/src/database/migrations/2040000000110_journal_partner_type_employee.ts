import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // Allow 'employee' as a journal line partner.
    // A cashier shortage charged to the custodian is a receivable that must carry a sub-ledger
    // identity; without it, account 1135 is a pooled balance nobody can be held against.
    // =========================================================================
    await sql`
      ALTER TABLE journal_entry_lines
        DROP CONSTRAINT IF EXISTS journal_entry_lines_partner_type_chk;
    `.execute(db);

    await sql`
      ALTER TABLE journal_entry_lines
        ADD CONSTRAINT journal_entry_lines_partner_type_chk
        CHECK (partner_type IN ('none', 'customer', 'supplier', 'employee'));
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    // Collapse any employee partners back to 'none' so the narrower constraint can be restored.
    await sql`
      UPDATE journal_entry_lines
      SET partner_type = 'none', partner_id = NULL
      WHERE partner_type = 'employee';
    `.execute(db);

    await sql`
      ALTER TABLE journal_entry_lines
        DROP CONSTRAINT IF EXISTS journal_entry_lines_partner_type_chk;
    `.execute(db);

    await sql`
      ALTER TABLE journal_entry_lines
        ADD CONSTRAINT journal_entry_lines_partner_type_chk
        CHECK (partner_type IN ('none', 'customer', 'supplier'));
    `.execute(db);
  },
};
