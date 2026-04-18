import { buildPagination } from './reports-range.helper';
import { toMoney } from './reports-math.helper';

export type TreasuryTransactionRow = {
  id?: number | string | null;
  txn_type?: string | null;
  amount?: number | string | null;
  note?: string | null;
  reference_type?: string | null;
  reference_id?: number | string | null;
  branch_id?: number | string | null;
  location_id?: number | string | null;
  branch_name?: string | null;
  location_name?: string | null;
  created_by_name?: string | null;
  created_at?: string | Date | null;
};

export type TreasurySummaryRow = {
  cash_in?: number | string | null;
  cash_out?: number | string | null;
  net_total?: number | string | null;
};

export type AuditLogRow = {
  id?: number | string | null;
  action?: string | null;
  details?: string | null;
  username?: string | null;
  created_at?: string | Date | null;
};

export function mapTreasuryTransactions(rows: TreasuryTransactionRow[]) {
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    type: row.txn_type || '',
    amount: Number(row.amount || 0),
    note: row.note || '',
    referenceType: row.reference_type || '',
    referenceId: row.reference_id ? String(row.reference_id) : '',
    branchId: row.branch_id ? String(row.branch_id) : '',
    locationId: row.location_id ? String(row.location_id) : '',
    branchName: row.branch_name || '',
    locationName: row.location_name || '',
    createdBy: row.created_by_name || '',
    date: row.created_at || '',
  }));
}

export function buildTreasurySummary(summaryRow: TreasurySummaryRow | null | undefined) {
  return {
    cashIn: toMoney(summaryRow?.cash_in ?? 0),
    cashOut: Math.abs(toMoney(summaryRow?.cash_out ?? 0)),
    net: toMoney(summaryRow?.net_total ?? 0),
  };
}

export function buildTreasuryPayload(args: {
  rows: TreasuryTransactionRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  summaryRow?: TreasurySummaryRow | null;
}) {
  const { rows, page, pageSize, totalItems, summaryRow } = args;
  return {
    treasury: mapTreasuryTransactions(rows),
    pagination: buildPagination(page, pageSize, totalItems),
    summary: buildTreasurySummary(summaryRow),
  };
}

export function mapAuditLogs(rows: AuditLogRow[]) {
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    action: row.action || '',
    details: row.details || '',
    user: row.username || '',
    date: row.created_at || '',
    createdAt: row.created_at || '',
    created_at: row.created_at || '',
    createdByName: row.username || '',
  }));
}

export function buildAuditPayload(args: {
  rows: AuditLogRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  distinctUsers: number;
  todayCount?: number;
}) {
  const { rows, page, pageSize, totalItems, distinctUsers, todayCount = 0 } = args;
  return {
    auditLogs: mapAuditLogs(rows),
    pagination: buildPagination(page, pageSize, totalItems),
    summary: {
      totalItems,
      distinctUsers,
      todayCount,
    },
  };
}
