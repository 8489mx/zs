import { type Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    // Drop the rigid unique index that prevented re-depositing or re-cycling restored cheques
    await sql`DROP INDEX IF EXISTS idx_journal_entries_pdc_and_wht_uniq`.execute(db);

    // Recreate the unique index only for active (unreversed) journal entries.
    // When a cheque is restored to safe or cancelled, the old entry is marked with reversed_by_entry_id,
    // which cleanly allows new cycle entries (e.g. re-deposit, re-bounce) without unique constraint failure.
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
      ) AND reversed_by_entry_id IS NULL
    `.execute(db);
  },

  async down(db: Kysely<any>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_journal_entries_pdc_and_wht_uniq`.execute(db);

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
  },
};
