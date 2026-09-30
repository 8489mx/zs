import { buildPagination, paginate } from './reports-range.helper';
import { toMoney } from './reports-math.helper';
import {
  buildCustomerBalanceRows,
  buildSupplierBalanceRows,
  filterCustomerBalanceRows,
  filterSupplierBalanceRows,
  summarizeCustomerBalanceRows,
  summarizeSupplierBalanceRows,
} from './reports-balances.helper';

export type CustomerBalanceSourceRow = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  balance?: number | string | null;
  credit_limit?: number | string | null;
};

export type SupplierBalanceSourceRow = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  balance?: number | string | null;
};

export type CustomerPartnerRow = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  balance?: number | string | null;
  credit_limit?: number | string | null;
};

export type SupplierPartnerRow = {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  balance?: number | string | null;
};

export type PartnerLedgerEntryRow = {
  id?: number | string | null;
  entry_type?: string | null;
  amount?: number | string | null;
  balance_after?: number | string | null;
  note?: string | null;
  reference_type?: string | null;
  reference_id?: number | string | null;
  created_at?: string | Date | null;
};

export type LedgerSummaryRow = {
  debits_total?: number | string | null;
  credits_total?: number | string | null;
};

export function buildCustomerBalancesPayload(
  customers: CustomerBalanceSourceRow[],
  ledgerTotals: Map<string, number>,
  query: Record<string, unknown>,
) {
  const rows = filterCustomerBalanceRows(buildCustomerBalanceRows(customers, ledgerTotals), query);
  const paged = paginate(rows, query as any, 20);

  return {
    customers: paged.rows,
    pagination: paged.pagination,
    summary: summarizeCustomerBalanceRows(rows),
  };
}

export function buildSupplierBalancesPayload(
  suppliers: SupplierBalanceSourceRow[],
  ledgerTotals: Map<string, number>,
  query: Record<string, unknown>,
) {
  const rows = filterSupplierBalanceRows(buildSupplierBalanceRows(suppliers, ledgerTotals), query);
  const paged = paginate(rows, query as any, 20);

  return {
    suppliers: paged.rows,
    pagination: paged.pagination,
    summary: summarizeSupplierBalanceRows(rows),
  };
}

export function mapLedgerEntries(rows: PartnerLedgerEntryRow[]) {
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    type: row.entry_type || '',
    amount: Number(row.amount || 0),
    balanceAfter: Number(row.balance_after || 0),
    note: row.note || '',
    referenceType: row.reference_type || '',
    referenceId: row.reference_id ? String(row.reference_id) : '',
    createdAt: row.created_at || '',
  }));
}

export function buildLedgerSummary(
  totalItems: number,
  totalsRow: LedgerSummaryRow | null | undefined,
  openingBalance?: number,
) {
  const totalDebits = toMoney(totalsRow?.debits_total ?? 0);
  const totalCredits = Math.abs(toMoney(totalsRow?.credits_total ?? 0));
  const base = {
    totalEntries: totalItems,
    totalDebits,
    totalCredits,
  };
  if (openingBalance !== undefined) {
    const openBal = toMoney(openingBalance);
    return {
      ...base,
      openingBalance: openBal,
      closingBalance: toMoney(openBal + totalDebits - totalCredits),
    };
  }
  return base;
}

export function buildCustomerLedgerPayload(args: {
  customer: CustomerPartnerRow;
  rows: PartnerLedgerEntryRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalsRow?: LedgerSummaryRow | null;
  openingBalance?: number;
}) {
  const { customer, rows, page, pageSize, totalItems, totalsRow, openingBalance } = args;
  return {
    customer: {
      id: String(customer.id),
      name: customer.name || '',
      phone: customer.phone || '',
      balance: Number(customer.balance || 0),
      creditLimit: Number(customer.credit_limit || 0),
    },
    entries: mapLedgerEntries(rows),
    pagination: buildPagination(page, pageSize, totalItems),
    summary: buildLedgerSummary(totalItems, totalsRow, openingBalance),
  };
}

export function buildSupplierLedgerPayload(args: {
  supplier: SupplierPartnerRow;
  rows: PartnerLedgerEntryRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalsRow?: LedgerSummaryRow | null;
  openingBalance?: number;
}) {
  const { supplier, rows, page, pageSize, totalItems, totalsRow, openingBalance } = args;
  return {
    supplier: {
      id: String(supplier.id),
      name: supplier.name || '',
      phone: supplier.phone || '',
      balance: Number(supplier.balance || 0),
    },
    entries: mapLedgerEntries(rows),
    pagination: buildPagination(page, pageSize, totalItems),
    summary: buildLedgerSummary(totalItems, totalsRow, openingBalance),
  };
}
