import { sql, type Kysely } from 'kysely';

// O34. `impersonateTenant` lets a platform admin open a session AS the tenant's owner: it
// inserts a row into `sessions` with `user_id = owner.id` and nothing else. From that
// point the impersonated session is indistinguishable from the owner's own, so every
// audit row written during it carries `created_by = owner.id`.
//
// Only the start and end of the visit were recorded. Everything done in between — posting
// a journal, approving a settlement, deleting data — was attributed to the customer, in
// the books of a company the platform does not own. That is the gap this closes.
//
// Two columns, because the question is asked in two places:
//   - sessions.impersonated_by  -> who is actually driving this session right now
//   - audit_logs.impersonated_by -> who actually performed this recorded action
// The audit column is the one that matters after the fact; the session column is where it
// is derived from on every request.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS impersonated_by BIGINT NULL REFERENCES users(id)
    `.execute(db);

    await sql`
      ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS impersonated_by BIGINT NULL
    `.execute(db);

    // Finding "everything a platform admin did inside customer books" is the whole point,
    // so make that query cheap. Partial: impersonated rows are a tiny minority.
    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_impersonated_by
      ON audit_logs (impersonated_by, created_at DESC)
      WHERE impersonated_by IS NOT NULL
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_audit_logs_impersonated_by`.execute(db);
    await sql`ALTER TABLE audit_logs DROP COLUMN IF EXISTS impersonated_by`.execute(db);
    await sql`ALTER TABLE sessions DROP COLUMN IF EXISTS impersonated_by`.execute(db);
  },
};
