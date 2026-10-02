import { sql, type Kysely } from 'kysely';

/** Atomic inter-account treasury transfers with tenant-scoped idempotency. */
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS treasury_transfers (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        from_account_id BIGINT NOT NULL REFERENCES accounting_accounts(id) ON DELETE RESTRICT,
        to_account_id BIGINT NOT NULL REFERENCES accounting_accounts(id) ON DELETE RESTRICT,
        amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
        note TEXT NOT NULL DEFAULT '',
        request_key TEXT NOT NULL,
        journal_entry_id BIGINT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
        created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT treasury_transfers_distinct_accounts_chk CHECK (from_account_id <> to_account_id),
        CONSTRAINT treasury_transfers_tenant_request_uniq UNIQUE (tenant_id, request_key)
      )
    `.execute(db);
    await sql`
      CREATE INDEX IF NOT EXISTS idx_treasury_transfers_tenant_created
      ON treasury_transfers (tenant_id, created_at DESC, id DESC)
    `.execute(db);
    await sql`
      CREATE INDEX IF NOT EXISTS idx_treasury_transfers_tenant_accounts
      ON treasury_transfers (tenant_id, from_account_id, to_account_id, created_at DESC)
    `.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_treasury_transfers_tenant_accounts`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_treasury_transfers_tenant_created`.execute(db);
    await sql`DROP TABLE IF EXISTS treasury_transfers`.execute(db);
  },
};
