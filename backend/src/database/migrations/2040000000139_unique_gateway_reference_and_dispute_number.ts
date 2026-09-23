import { sql, type Kysely } from 'kysely';

// O38 + O44: two numbers that must be unique per tenant but were only indexed.
//
// O38 `tenant_subscription_payments (tenant_id, reference)` — the gateway's own transaction id.
// Migration 129 deliberately left it non-unique because a deployment could already hold duplicates
// created by the replay bug it fixed, and merging real payment rows is not a migration's call. The
// service-level gate has been in place since; this promotes the guarantee to the database, but only
// where the data allows it: with duplicates present the unique index is skipped and logged, and the
// plain index from 129 keeps serving the lookup.
//
// O44 `maritime_carrier_disputes (tenant_id, dispute_number)` — every other maritime document
// (RFQ/QUO/JOB/INQ) carries this constraint; disputes were missed, so a concurrent create could
// hand two disputes the same number.
//
// Both are partial: rows with no number are not constrained against each other.

type Target = {
  table: string;
  column: string;
  indexName: string;
  item: string;
};

const TARGETS: Target[] = [
  {
    table: 'tenant_subscription_payments',
    column: 'reference',
    indexName: 'uq_tenant_subscription_payments_tenant_reference',
    item: 'O38',
  },
  {
    table: 'maritime_carrier_disputes',
    column: 'dispute_number',
    indexName: 'uq_maritime_carrier_disputes_tenant_number',
    item: 'O44',
  },
];

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    for (const target of TARGETS) {
      const exists = await sql<{ exists: boolean }>`
        select exists (
          select 1 from information_schema.tables
          where table_schema = 'public' and table_name = ${target.table}
        ) as exists
      `.execute(db);
      if (!exists.rows[0]?.exists) continue;

      const duplicates = await sql<{ tenant_id: string; value: string; hits: string }>`
        SELECT tenant_id, ${sql.ref(target.column)} AS value, COUNT(*)::text AS hits
        FROM ${sql.table(target.table)}
        WHERE ${sql.ref(target.column)} IS NOT NULL AND ${sql.ref(target.column)} <> ''
        GROUP BY tenant_id, ${sql.ref(target.column)}
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 50
      `.execute(db);

      if (duplicates.rows.length > 0) {
        const summary = duplicates.rows.map((row) => `${row.tenant_id}/${row.value} x${row.hits}`).join(', ');
        // Loud on purpose: existing rows are never merged or deleted by a migration.
        console.warn(
          `[migration 139] ${target.item}: ${target.table}.${target.column} still holds duplicates, so the unique index was not created. Reconcile these rows, then re-run this migration: ${summary}`,
        );
        continue;
      }

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS ${sql.ref(target.indexName)}
        ON ${sql.table(target.table)} (tenant_id, ${sql.ref(target.column)})
        WHERE ${sql.ref(target.column)} IS NOT NULL AND ${sql.ref(target.column)} <> ''
      `.execute(db);
    }
  },

  async down(db: Kysely<unknown>): Promise<void> {
    for (const target of TARGETS) {
      await sql`DROP INDEX IF EXISTS ${sql.ref(target.indexName)}`.execute(db);
    }
  },
};
