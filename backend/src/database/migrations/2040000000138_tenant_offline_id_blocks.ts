import { sql, type Kysely } from 'kysely';

// Tenant packages (src/core/tenant-transfer) move one tenant between the cloud and a desktop
// install with every row keeping its original id, so no reference ever needs remapping.
//
// Rows a shop creates while running offline on the desktop must not collide with ids the cloud
// hands out to other tenants in the meantime, or they could never be imported back. Each tenant is
// given its own id block above RESERVED_OFFLINE_ID_BASE (1,000,000,000): the desktop starts its
// sequences inside that block, and the cloud never raises a sequence into the reserved range.
// Blocks are allocated once per tenant, on its first package export, and never reused.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_offline_id_blocks (
        tenant_id TEXT PRIMARY KEY,
        block_index INTEGER NOT NULL UNIQUE CHECK (block_index >= 0),
        allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP TABLE IF EXISTS tenant_offline_id_blocks`.execute(db);
  },
};
