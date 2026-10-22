import { Kysely, sql } from 'kysely';

/**
 * Adds journal_entry_id to import_inventory_receipts so that the inventory
 * receipt double-entry posting (DR Inventory / CR Accounts Payable) is
 * permanently linked back to the GL journal that records it.
 *
 * This column is nullable because legacy receipts were created without a
 * journal entry; going forward the receipt service always posts a journal
 * before committing the receipt.
 */
export const migration = {
  up: async (db: Kysely<unknown>): Promise<void> => {
    await sql`ALTER TABLE import_inventory_receipts
      ADD COLUMN IF NOT EXISTS journal_entry_id BIGINT`.execute(db);
  },
  down: async (): Promise<void> => {
    throw new Error('Import receipt journal links are permanent. Use a forward migration instead.');
  },
};
