import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AppError } from '../../common/errors/app-error';
import { assertCashDrawerAmount, assertCashDrawerCountedCash, assertCashDrawerNote, buildCashDrawerShiftDocNo, computeCashDrawerVariance, filterCashDrawerRows, mapCashDrawerShiftRow, normalizeCashDrawerMovementType, normalizeShiftOpenPayload, paginateCashDrawerRows, summarizeCashDrawerRows, toSignedCashDrawerAmount } from './helpers/cash-drawer.helper';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { verifyPassword } from '../../core/auth/utils/password-hasher';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';

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
type UserPasswordRow = {
  id?: number | string;
  is_active?: boolean | number | string | null;
  password_hash?: string | null;
  password_salt?: string | null;
};

@Injectable()
export class CashDrawerService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

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

  private shouldRequireManagerApprovalForCashOut(auth: AuthContext): boolean {
    const role = String(auth.role || '').trim();
    return !['admin', 'super_admin', 'manager'].includes(role);
  }

  private async assertCurrentUserPassword(password: string, auth: AuthContext): Promise<void> {
    const providedPassword = String(password || '').trim();
    if (!providedPassword) {
      throw new AppError('أدخل كلمة مرور المستخدم الحالي', 'CURRENT_USER_PASSWORD_REQUIRED', 400);
    }

    const result = await sql<UserPasswordRow>`
      select id, is_active, password_hash, password_salt
      from users
      where id = ${auth.userId}
      limit 1
    `.execute(this.db);

    const user = result.rows?.[0] || null;
    if (!user || user.is_active === false || user.is_active === 0 || user.is_active === 'false') {
      throw new AppError('المستخدم الحالي غير متاح', 'CURRENT_USER_NOT_FOUND', 400);
    }

    const passwordCheck = await verifyPassword(providedPassword, String(user.password_hash || ''), String(user.password_salt || ''));
    if (!passwordCheck.valid) {
      throw new AppError('كلمة مرور المستخدم الحالي غير صحيحة', 'CURRENT_USER_PASSWORD_INVALID', 400);
    }
  }

  private async assertCashDrawerApproval(
    movementType: 'cash_in' | 'cash_out',
    approvalSecret: string,
    auth: AuthContext,
  ): Promise<void> {
    if (movementType === 'cash_out' && this.shouldRequireManagerApprovalForCashOut(auth)) {
      await this.assertManagerPin(approvalSecret);
      return;
    }

    await this.assertCurrentUserPassword(approvalSecret, auth);
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
    const rowsWithLiveExpectedCash = await Promise.all(rows.map(async (row) => {
      if (String(row.status || 'open') !== 'open') return row;

      const shiftId = Number(row.id || 0);
      if (!(shiftId > 0)) return row;

      const expectedCash = await this.computeShiftExpectedCash(shiftId);
      return { ...row, expected_cash: expectedCash };
    }));

    return rowsWithLiveExpectedCash.map((row) => mapCashDrawerShiftRow(row));
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

    const totals = await sql<{ shift_total?: number | string; sales_total?: number | string }>`
      select
        coalesce(sum(case when tt.reference_type = 'cashier_shift' and tt.reference_id = ${shiftId} then tt.amount else 0 end), 0) as shift_total,
        coalesce(sum(case when tt.reference_type = 'sale' then tt.amount else 0 end), 0) as sales_total
      from treasury_transactions tt
      where (
          tt.reference_type = 'cashier_shift'
          and tt.reference_id = ${shiftId}
        )
        or (
          tt.reference_type = 'sale'
          and tt.created_by = ${Number(shift.opened_by || 0)}
          and tt.created_at >= ${shift.created_at || null}
          and (${shift.closed_at || null}::timestamptz is null or tt.created_at <= ${shift.closed_at || null})
          and (${shift.branch_id || null}::int is null or tt.branch_id is null or tt.branch_id = ${Number(shift.branch_id || 0) || null})
          and (${shift.location_id || null}::int is null or tt.location_id is null or tt.location_id = ${Number(shift.location_id || 0) || null})
        )
    `.execute(this.db);

    const movementTotal = Number(totals.rows?.[0]?.shift_total || 0);
    const cashSalesTotal = Number(totals.rows?.[0]?.sales_total || 0);
    return Number((Number(shift.opening_cash || 0) + movementTotal + cashSalesTotal).toFixed(2));
  }

  async listCashierShifts(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const mapped = await this.rawList();
    const filtered = filterCashDrawerRows(mapped, query);
    const paged = paginateCashDrawerRows(filtered, query);

    return {
      cashierShifts: paged.rows,
      pagination: paged.pagination,
      summary: summarizeCashDrawerRows(filtered),
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

    const { openingCash, note, branchId, locationId } = normalizeShiftOpenPayload(payload);

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

    const docNo = buildCashDrawerShiftDocNo(shiftId);
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

    const movementType = normalizeCashDrawerMovementType(payload.type);
    const amount = Number(payload.amount || 0);
    const note = String(payload.note || '').trim();

    assertCashDrawerAmount(amount);
    assertCashDrawerNote(note);

    await this.assertCashDrawerApproval(movementType, String(payload.managerPin || '').trim(), auth);

    const signedAmount = toSignedCashDrawerAmount(movementType, amount);

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
    `.execute(this.db);

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

    assertCashDrawerCountedCash(countedCash);

    await this.assertCurrentUserPassword(String(payload.managerPin || '').trim(), auth);

    const expectedCash = await this.computeShiftExpectedCash(shiftId);
    const variance = computeCashDrawerVariance(countedCash, expectedCash);

    if (Math.abs(variance) >= 0.01) {
      assertCashDrawerNote(note);
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
