import type { Purchase, Sale } from '@/types/domain';

export function matchTransactionSearch(transaction: Sale | Purchase, query: string, extraValues: unknown[] = []) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    transaction.docNo,
    'customerName' in transaction ? transaction.customerName : undefined,
    'supplierName' in transaction ? transaction.supplierName : undefined,
    transaction.status,
    transaction.paymentType,
    transaction.branchName,
    transaction.locationName,
    ...extraValues
  ].some((value) => String(value || '').toLowerCase().includes(q));
}

export function sumTransactionTotals<T extends Sale | Purchase>(rows: T[]) {
  return rows.reduce(
    (acc, row) => {
      acc.total += Number(row.total || 0);
      acc.posted += row.status === 'posted' ? 1 : 0;
      acc.draft += row.status !== 'posted' ? 1 : 0;
      return acc;
    },
    { total: 0, posted: 0, draft: 0 }
  );
}
