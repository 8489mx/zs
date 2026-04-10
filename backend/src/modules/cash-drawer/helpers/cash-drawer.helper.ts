import { AppError } from '../../../common/errors/app-error';

type CashDrawerQuery = Record<string, unknown>;
type CashDrawerMappedRow = Record<string, unknown>;

type CashDrawerShiftSource = {
  id?: number | string;
  doc_no?: string | null;
  branch_id?: number | string | null;
  location_id?: number | string | null;
  opened_by?: number | string | null;
  opening_cash?: number | string | null;
  opening_note?: string | null;
  status?: string | null;
  expected_cash?: number | string | null;
  counted_cash?: number | string | null;
  variance?: number | string | null;
  close_note?: string | null;
  closed_by_name?: string | null;
  closed_at?: Date | string | null;
  created_at?: Date | string | null;
  branch_name?: string | null;
  location_name?: string | null;
  opened_by_name?: string | null;
};

export function paginateCashDrawerRows<T>(rows: T[], query: CashDrawerQuery): { rows: T[]; pagination: Record<string, number> } {
  const rawPage = Number(query.page || 1);
  const rawPageSize = Number(query.pageSize || 20);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(100, Math.max(1, Math.floor(rawPageSize))) : 20;
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const sliced = rows.slice(start, start + pageSize);
  return {
    rows: sliced,
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      rangeStart: totalItems ? start + 1 : 0,
      rangeEnd: totalItems ? start + sliced.length : 0,
    },
  };
}

export function filterCashDrawerRows(rows: CashDrawerMappedRow[], query: CashDrawerQuery): CashDrawerMappedRow[] {
  const search = String(query.search || '').trim().toLowerCase();
  const filter = String(query.filter || 'all').trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    const status = String(row.status || '');
    const variance = Number(row.variance || 0);
    const openedAt = String(row.openedAt || row.createdAt || '');
    if (filter === 'open' && status !== 'open') return false;
    if (filter === 'closed' && status !== 'closed') return false;
    if (filter === 'variance' && Math.abs(variance) <= 0) return false;
    if (filter === 'today' && openedAt.slice(0, 10) !== today) return false;
    if (!search) return true;
    return [row.docNo, row.status, row.branchName, row.locationName, row.openedByName, row.openingNote, row.closeNote].some((value) => String(value || '').toLowerCase().includes(search));
  });
}

export function summarizeCashDrawerRows(rows: CashDrawerMappedRow[]): Record<string, unknown> {
  const openRows = rows.filter((row) => String(row.status || '') === 'open');
  return {
    totalItems: rows.length,
    openShiftCount: openRows.length,
    openShiftDocNo: openRows[0] ? String(openRows[0].docNo || openRows[0].id || '') : '',
    totalVariance: Number(rows.reduce((sum, row) => sum + Number(row.variance || 0), 0).toFixed(2)),
  };
}

export function mapCashDrawerShiftRow(row: CashDrawerShiftSource): CashDrawerMappedRow {
  return {
    id: String(row.id || ''),
    docNo: row.doc_no || (row.id ? `SHIFT-${row.id}` : ''),
    branchId: row.branch_id ? String(row.branch_id) : '',
    branchName: row.branch_name || '',
    locationId: row.location_id ? String(row.location_id) : '',
    locationName: row.location_name || '',
    openedById: row.opened_by ? String(row.opened_by) : '',
    openedByName: row.opened_by_name || '',
    openingCash: Number(row.opening_cash || 0),
    openingNote: row.opening_note || '',
    status: row.status || 'open',
    expectedCash: Number(row.expected_cash || 0),
    countedCash: row.counted_cash == null ? null : Number(row.counted_cash || 0),
    variance: row.variance == null ? 0 : Number(row.variance || 0),
    closeNote: row.close_note || '',
    closedBy: row.closed_by_name || '',
    closedAt: row.closed_at || '',
    openedAt: row.created_at || '',
    createdAt: row.created_at || '',
    transactionCount: 0,
  };
}

export function buildCashDrawerShiftDocNo(shiftId: number): string { return `SHIFT-${shiftId}`; }

export function normalizeShiftOpenPayload(payload: { openingCash?: number; note?: string; branchId?: number | string | null; locationId?: number | string | null; }): { openingCash: number; note: string; branchId: number | null; locationId: number | null; } {
  return { openingCash: Number(payload.openingCash || 0), note: String(payload.note || '').trim(), branchId: payload.branchId ? Number(payload.branchId) : null, locationId: payload.locationId ? Number(payload.locationId) : null };
}

export function assertCashDrawerAmount(amount: number): void { if (!(amount > 0)) throw new AppError('المبلغ يجب أن يكون أكبر من صفر', 'AMOUNT_INVALID', 400); }
export function assertCashDrawerCountedCash(countedCash: number): void { if (!(countedCash >= 0)) throw new AppError('المبلغ المعدود لا يمكن أن يكون سالبًا', 'COUNTED_CASH_INVALID', 400); }
export function assertCashDrawerNote(note: string, code = 'NOTE_TOO_SHORT', minLength = 8): void { if (String(note || '').trim().length < minLength) throw new AppError('اكتب سبب الحركة بوضوح في 8 أحرف على الأقل', code, 400); }
export function normalizeCashDrawerMovementType(type?: string): 'cash_in' | 'cash_out' { return String(type || '').trim() === 'cash_out' ? 'cash_out' : 'cash_in'; }
export function toSignedCashDrawerAmount(type: 'cash_in' | 'cash_out', amount: number): number { return type === 'cash_out' ? -Math.abs(amount) : Math.abs(amount); }
export function computeCashDrawerVariance(countedCash: number, expectedCash: number): number { return Number((countedCash - expectedCash).toFixed(2)); }
