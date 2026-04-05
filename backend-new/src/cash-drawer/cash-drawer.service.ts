import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AppError } from '../common/errors/app-error';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';

type ShiftRow = {
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
  closed_by?: number | string | null;
  closed_at?: Date | string | null;
  created_at?: Date | string | null;
  branch_name?: string | null;
  location_name?: string | null;
  opened_by_name?: string | null;
  closed_by_name?: string | null;
};

type SettingsRow = { key?: string; value?: string | null };

@Injectable()
export class CashDrawerService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private paginate<T>(rows: T[], query: Record<string, unknown>): { rows: T[]; pagination: Record<string, number> } {
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

  private filterRows(rows: Array<Record<string, unknown>>, query: Record<string, unknown>): Array<Record<string, unknown>> {
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

      return [
        row.docNo,
        row.status,
        row.branchName,
        row.locationName,
        row.openedByName,
        row.openingNote,
        row.closeNote,
      ].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }

  private summarize(rows: Array<Record<string, unknown>>): Record<string, unknown> {
    const openRows = rows.filter((row) => String(row.status || '') === 'open');
    return {
      totalItems: rows.length,
      openShiftCount: openRows.length,
      openShiftDocNo: openRows[0] ? String(openRows[0].docNo || openRows[0].id || '') : '',
      totalVariance: Number(rows.reduce((sum, row) => sum + Number(row.variance || 0), 0).toFixed(2)),
    };
  }

  private async getManagerPin(): Promise<string> {
    const result = await sql<SettingsRow>`
      select key, value from settings
      where key in ('managerPin', 'managerApprovalPin', 'manager_pin')
    `.execute(this.db);

    const value = result.rows?.find((row) => String(row.key || '').length > 0)?.value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
      } catch {
        return value.trim();
      }
    }

    return '1234';
  }

  private async assertManagerPin(pin: string): Promise<void> {
    const expected = await this.getManagerPin();
    if (String(pin || '').trim() !== expected) {
      throw new AppError('رمز اعتماد المدير غير صحيح', 'MANAGER_PIN_INVALID', 400);
    }
  }

  private async rawList(): Promise<Array<Record<string, unknown>>> {
    const result = await sql<ShiftRow>`
      select
        s.id,
        s.doc_no,
        s.branch_id,
        s.location_id,
        s.opened_by,
        s.opening_cash,
        s.opening_note,
        s.status,
        s.expected_cash,
        s.counted_cash,
        s.variance,
        s.close_note,
        s.closed_by,
        s.closed_at,
        s.created_at,
        coalesce(b.name, '') as branch_name,
        coalesce(l.name, '') as location_name,
        coalesce(ou.username, '') as opened_by_name,
        coalesce(cu.username, '') as closed_by_name
      from cashier_shifts s
      left join branches b on b.id = s.branch_id
      left join stock_locations l on l.id = s.location_id
      left join users ou on ou.id = s.opened_by
      left join users cu on cu.id = s.closed_by
      order by s.id desc
    `.execute(this.db);

    const rows = result.rows ?? [];
    return rows.map((row) => ({
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
    }));
  }

  private async getShift(shiftId: number): Promise<ShiftRow | null> {
    const result = await sql<ShiftRow>`
      select *
      from cashier_shifts
      where id = ${shiftId}
      limit 1
    `.execute(this.db);

    return result.rows?.[0] || null;
  }

  private async computeShiftExpectedCash(shiftId: number): Promise<number> {
    const shift = await this.getShift(shiftId);
    if (!shift) return 0;

    const totals = await sql<{ total?: number | string }>`
      select coalesce(sum(amount), 0) as total
      from treasury_transactions
      where reference_type = 'cashier_shift'
        and reference_id = ${shiftId}
    `.execute(this.db);

    const movementTotal = Number(totals.rows?.[0]?.total || 0);
    return Number((Number(shift.opening_cash || 0) + movementTotal).toFixed(2));
  }

  async listCashierShifts(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const mapped = await this.rawList();
    const filtered = this.filterRows(mapped, query);
    const paged = this.paginate(filtered, query);

    return {
      cashierShifts: paged.rows,
      pagination: paged.pagination,
      summary: this.summarize(filtered),
      viewerRole: auth.role,
    };
  }

  async openCashierShift(
    payload: { openingCash?: number; note?: string; branchId?: number | string | null; locationId?: number | string | null },
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    const active = await sql<{ count?: number }>`
      select count(*)::int as count
      from cashier_shifts
      where opened_by = ${auth.userId} and status = 'open'
    `.execute(this.db);

    const openCount = Number(active.rows?.[0]?.count || 0);
    if (openCount > 0) {
      throw new AppError('يوجد وردية مفتوحة بالفعل لهذا المستخدم', 'SHIFT_ALREADY_OPEN', 400);
    }

    const openingCash = Number(payload.openingCash || 0);
    const note = String(payload.note || '').trim();
    const branchId = payload.branchId ? Number(payload.branchId) : null;
    const locationId = payload.locationId ? Number(payload.locationId) : null;

    const inserted = await sql<{ id?: number }>`
      insert into cashier_shifts (
        doc_no,
        branch_id,
        location_id,
        opened_by,
        opening_cash,
        opening_note,
        status,
        expected_cash
      )
      values (
        null,
        ${branchId},
        ${locationId},
        ${auth.userId},
        ${openingCash},
        ${note},
        'open',
        ${openingCash}
      )
      returning id
    `.execute(this.db);

    const shiftId = Number(inserted.rows?.[0]?.id || 0);
    if (!shiftId) {
      throw new AppError('Could not open cashier shift', 'SHIFT_OPEN_FAILED', 400);
    }

    const docNo = `SHIFT-${shiftId}`;
    await sql`
      update cashier_shifts
      set doc_no = ${docNo}
      where id = ${shiftId}
    `.execute(this.db);

    const listing = await this.listCashierShifts({}, auth);
    return { ok: true, cashierShifts: listing.cashierShifts, pagination: listing.pagination, summary: listing.summary };
  }

  async recordCashMovement(
    shiftId: number,
    payload: { type?: string; amount?: number; note?: string; managerPin?: string },
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    if (!(shiftId > 0)) {
      throw new AppError('الوردية غير موجودة', 'SHIFT_NOT_FOUND', 404);
    }

    const shift = await this.getShift(shiftId);
    if (!shift) {
      throw new AppError('الوردية غير موجودة', 'SHIFT_NOT_FOUND', 404);
    }

    if (String(shift.status || 'open') !== 'open') {
      throw new AppError('لا يمكن تسجيل حركة على وردية مغلقة', 'SHIFT_CLOSED', 400);
    }

    if (Number(shift.opened_by || 0) !== Number(auth.userId || 0) && auth.role !== 'super_admin') {
      throw new AppError('غير مسموح لك بتعديل هذه الوردية', 'SHIFT_FORBIDDEN', 403);
    }

    const movementType = String(payload.type || '').trim() === 'cash_out' ? 'cash_out' : 'cash_in';
    const amount = Number(payload.amount || 0);
    const note = String(payload.note || '').trim();

    if (!(amount > 0)) {
      throw new AppError('المبلغ يجب أن يكون أكبر من صفر', 'AMOUNT_INVALID', 400);
    }

    if (note.length < 8) {
      throw new AppError('اكتب سبب الحركة بوضوح في 8 أحرف على الأقل', 'NOTE_TOO_SHORT', 400);
    }

    if (movementType === 'cash_out') {
      await this.assertManagerPin(String(payload.managerPin || '').trim());
    }

    const signedAmount = movementType === 'cash_out' ? -Math.abs(amount) : Math.abs(amount);

    await sql`
      insert into treasury_transactions (
        txn_type,
        amount,
        note,
        reference_type,
        reference_id,
        branch_id,
        location_id,
        created_by
      )
      values (
        ${movementType},
        ${signedAmount},
        ${`وردية ${shift.doc_no || shift.id}: ${note}`},
        'cashier_shift',
        ${shiftId},
        ${shift.branch_id ? Number(shift.branch_id) : null},
        ${shift.location_id ? Number(shift.location_id) : null},
        ${auth.userId}
      )
    `.execute(this.db)

    const expectedCash = await this.computeShiftExpectedCash(shiftId);

    await sql`
      update cashier_shifts
      set expected_cash = ${expectedCash}
      where id = ${shiftId}
    `.execute(this.db);

    const listing = await this.listCashierShifts({}, auth);
    return { ok: true, cashierShifts: listing.cashierShifts, pagination: listing.pagination, summary: listing.summary };
  }

  async closeCashierShift(
    shiftId: number,
    payload: { countedCash?: number; note?: string; managerPin?: string },
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    if (!(shiftId > 0)) {
      throw new AppError('الوردية غير موجودة', 'SHIFT_NOT_FOUND', 404);
    }

    const shift = await this.getShift(shiftId);
    if (!shift) {
      throw new AppError('الوردية غير موجودة', 'SHIFT_NOT_FOUND', 404);
    }

    if (String(shift.status || 'open') !== 'open') {
      throw new AppError('الوردية مغلقة بالفعل', 'SHIFT_ALREADY_CLOSED', 400);
    }

    if (Number(shift.opened_by || 0) !== Number(auth.userId || 0) && auth.role !== 'super_admin') {
      throw new AppError('غير مسموح لك بإغلاق هذه الوردية', 'SHIFT_FORBIDDEN', 403);
    }

    const countedCash = Number(payload.countedCash || 0);
    const note = String(payload.note || '').trim();

    if (!(countedCash >= 0)) {
      throw new AppError('المبلغ المعدود لا يمكن أن يكون سالبًا', 'COUNTED_CASH_INVALID', 400);
    }

    await this.assertManagerPin(String(payload.managerPin || '').trim());

    const expectedCash = await this.computeShiftExpectedCash(shiftId);
    const variance = Number((countedCash - expectedCash).toFixed(2));

    if (Math.abs(variance) >= 0.01 && note.length < 8) {
      throw new AppError('اكتب سبب فرق الجرد بوضوح في 8 أحرف على الأقل قبل إغلاق الوردية', 'NOTE_TOO_SHORT', 400);
    }

    await sql`
      update cashier_shifts
      set
        status = 'closed',
        expected_cash = ${expectedCash},
        counted_cash = ${countedCash},
        variance = ${variance},
        close_note = ${note},
        closed_by = ${auth.userId},
        closed_at = now()
      where id = ${shiftId}
    `.execute(this.db);

    const listing = await this.listCashierShifts({}, auth);
    return { ok: true, cashierShifts: listing.cashierShifts, pagination: listing.pagination, summary: listing.summary };
  }
}
