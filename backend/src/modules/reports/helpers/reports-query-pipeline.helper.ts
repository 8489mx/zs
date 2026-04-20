import { sql } from '../../../database/kysely';

function applySearch(query: any, searchPattern: string | undefined, fields: string[]) {
  if (!searchPattern) return query;
  return query.where((eb: any) =>
    eb.or(
      fields.map((field) => eb(sql.raw(`lower(coalesce(${field}, ''))`), 'like', searchPattern)),
    ),
  );
}

export function applyPartnerLedgerSearch(query: any, searchPattern: string | undefined) {
  return applySearch(query, searchPattern, ['note', 'entry_type', 'reference_type']);
}

export function applySignedAmountFilter(query: any, amountColumn: string, filter: string) {
  if (filter === 'debit' || filter === 'in') {
    return query.where(sql.raw(amountColumn), '>', 0);
  }
  if (filter === 'credit' || filter === 'out') {
    return query.where(sql.raw(amountColumn), '<', 0);
  }
  return query;
}

export function applyTreasurySearch(query: any, searchPattern: string | undefined) {
  return applySearch(query, searchPattern, ['t.txn_type', 't.note', 't.reference_type', 'u.username', 'b.name', 'l.name']);
}

export function applyAuditSearch(query: any, searchPattern: string | undefined) {
  return applySearch(query, searchPattern, ['a.action', 'a.details', 'u.username']);
}
