import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // IAS 21 monetary / non-monetary classification.
    // Only monetary items (cash, bank, receivables, payables) are retranslated at the closing rate.
    // Non-monetary items carried at historical cost (inventory, fixed assets, prepayments, equity)
    // must NOT be retranslated — doing so is a material misstatement.
    // Forex revaluation previously selected accounts by fuzzy name matching, which cannot make
    // this distinction; this flag is the explicit contract.
    // =========================================================================
    await sql`
      ALTER TABLE accounting_accounts
        ADD COLUMN IF NOT EXISTS is_monetary BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS revaluation_currency TEXT NULL;
    `.execute(db);

    // Seed the classification from the flags the chart already maintains.
    await sql`
      UPDATE accounting_accounts
      SET is_monetary = TRUE
      WHERE is_cash_bank = TRUE OR is_receivable = TRUE OR is_payable = TRUE;
    `.execute(db);

    // Inventory is explicitly non-monetary regardless of any other flag.
    await sql`
      UPDATE accounting_accounts
      SET is_monetary = FALSE
      WHERE is_inventory = TRUE;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_accounting_accounts_monetary
        ON accounting_accounts (tenant_id, revaluation_currency)
        WHERE is_monetary = TRUE AND revaluation_currency IS NOT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_accounting_accounts_monetary;`.execute(db);
    await sql`
      ALTER TABLE accounting_accounts
        DROP COLUMN IF EXISTS is_monetary,
        DROP COLUMN IF EXISTS revaluation_currency;
    `.execute(db);
  },
};
