import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';

/** Serialize a tenant's postings and fiscal-period transitions in one transaction. */
export async function lockAccountingPeriod(queryable: Kysely<Database>, tenantId: string): Promise<void> {
  await sql`SELECT pg_advisory_xact_lock(hashtext(${tenantId} || ':accounting-period'))`.execute(queryable);
}
