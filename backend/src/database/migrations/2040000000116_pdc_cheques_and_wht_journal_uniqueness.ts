import { type Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    // 1. Enforce database-level uniqueness for PDC Cheques and Withholding Tax journal entries
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_pdc_and_wht_uniq
      ON journal_entries(tenant_id, source_type, source_id)
      WHERE source_type IN (
        'pdc_cheque_receive',
        'pdc_cheque_deposit',
        'pdc_cheque_collect',
        'pdc_cheque_bounce',
        'pdc_cheque_endorse',
        'pdc_cheque_issue',
        'pdc_cheque_clear',
        'pdc_cheque_payable_bounce',
        'withholding_tax_remittance'
      )
    `.execute(db);

    // 2. Indexes for Bank Reconciliation performance and integrity
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_reconciliation
      ON bank_statement_lines(tenant_id, statement_id, is_reconciled)
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_reconciliation
      ON journal_entry_lines(tenant_id, account_id, is_reconciled)
    `.execute(db);
  },

  async down(db: Kysely<any>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_journal_entry_lines_reconciliation`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_bank_statement_lines_reconciliation`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_journal_entries_pdc_and_wht_uniq`.execute(db);
  },
};
