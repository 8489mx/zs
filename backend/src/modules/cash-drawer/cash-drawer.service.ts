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
  cash_sales_total?: number | string | null;
  card_sales_total?: number | string | null;
  wallet_sales_total?: number | string | null;
  instapay_sales_total?: number | string | null;
  credit_sales_total?: number | string | null;
  shift_sales_total?: number | string | null;
  sale_count?: number | string | null;
  mixed_sale_count?: number | string | null;
  card_operation_count?: number | string | null;
  wallet_operation_count?: number | string | null;
  instapay_operation_count?: number | string | null;
  cash_drawer_movement_total?: number | string | null;
  service_cash_total?: number | string | null;
  service_card_total?: number | string | null;
  service_total?: number | string | null;
  sale_return_cash_refund_total?: number | string | null;
  sale_return_card_refund_total?: number | string | null;
  sale_return_total?: number | string | null;
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


type ShiftSalesBreakdown = {
  cashSalesTotal: number;
  cardSalesTotal: number;
  walletSalesTotal: number;
  instapaySalesTotal: number;
  creditSalesTotal: number;
  shiftSalesTotal: number;
  saleCount: number;
  mixedSalesCount: number;
  cardOperationCount: number;
  walletOperationCount: number;
  instapayOperationCount: number;
};

type ShiftSalesBreakdownRow = {
  cash_sales_total?: number | string | null;
  card_sales_total?: number | string | null;
  wallet_sales_total?: number | string | null;
  instapay_sales_total?: number | string | null;
  credit_sales_total?: number | string | null;
  shift_sales_total?: number | string | null;
  sale_count?: number | string | null;
  mixed_sale_count?: number | string | null;
  card_operation_count?: number | string | null;
  wallet_operation_count?: number | string | null;
  instapay_operation_count?: number | string | null;
};

type CashDrawerMovementRow = { cash_drawer_movement_total?: number | string | null };

type ShiftServiceBreakdown = {
  serviceCashTotal: number;
  serviceCardTotal: number;
  serviceTotal: number;
};

type ShiftServiceBreakdownRow = {
  service_cash_total?: number | string | null;
  service_card_total?: number | string | null;
  service_total?: number | string | null;
};

type ShiftSaleReturnTotals = {
  saleReturnCashRefundTotal: number;
  saleReturnCardRefundTotal: number;
  saleReturnTotal: number;
};

type ShiftSaleReturnTotalsRow = {
  sale_return_cash_refund_total?: number | string | null;
  sale_return_card_refund_total?: number | string | null;
  sale_return_total?: number | string | null;
};

type CloseOperationDetailInput = {
  amount?: number;
  reference?: string;
};

type BlindCloseMetadata = {
  blindClose: true;
  declared: {
    cash: number;
    cardTotal: number;
    cardCount: number;
    walletTotal: number;
    walletCount: number;
    instapayTotal: number;
    instapayCount: number;
  };
  detailTotals: {
    card: number;
    wallet: number;
    instapay: number;
  };
  details: {
    card: Array<{ amount: number; reference?: string }>;
    wallet: Array<{ amount: number; reference?: string }>;
    instapay: Array<{ amount: number; reference?: string }>;
  };
  managerReview?: {
    note: string;
    reviewedById: number;
    reviewedByName: string;
    reviewedAt: string;
  };
  note: string;
};

const BLIND_CLOSE_NOTE_PREFIX = 'BLIND_CLOSE::';

@Injectable()
export class CashDrawerService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private toMoney(value: unknown): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private normalizeOperationCount(value: unknown): number {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }

  private normalizeOperationDetails(details: unknown, maxCount: number): Array<{ amount: number; reference?: string }> {
    if (!Array.isArray(details) || maxCount <= 0) return [];
    return details.slice(0, maxCount).map((entry) => {
      const amount = this.toMoney((entry as CloseOperationDetailInput)?.amount || 0);
      const reference = String((entry as CloseOperationDetailInput)?.reference || '').trim();
      return {
        amount: amount >= 0 ? amount : 0,
        ...(reference ? { reference } : {}),
      };
    });
  }

  private serializeBlindCloseNote(meta: BlindCloseMetadata): string {
    return `${BLIND_CLOSE_NOTE_PREFIX}${JSON.stringify(meta)}`;
  }

  private parseBlindCloseNote(rawNote: unknown): BlindCloseMetadata | null {
    const text = String(rawNote || '');
    if (!text.startsWith(BLIND_CLOSE_NOTE_PREFIX)) return null;
    const rawJson = text.slice(BLIND_CLOSE_NOTE_PREFIX.length).trim();
    if (!rawJson) return null;
    try {
      const parsed = JSON.parse(rawJson) as BlindCloseMetadata;
      if (!parsed || typeof parsed !== 'object' || parsed.blindClose !== true) return null;
      return parsed;
    } catch {
      return null;
    }
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

  private shouldRequireManagerApprovalForCashOut(auth: AuthContext): boolean {
    const role = String(auth.role || '').trim();
    return !['admin', 'super_admin', 'manager'].includes(role);
  }

  private canReviewPendingShift(auth: AuthContext): boolean {
    const role = String(auth.role || '').trim();
    return ['admin', 'super_admin', 'manager'].includes(role);
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

  private async computeShiftCashDrawerMovementTotal(shiftId: number): Promise<number> {
    const result = await sql<CashDrawerMovementRow>`
      select coalesce(sum(tt.amount), 0) as cash_drawer_movement_total
      from treasury_transactions tt
      where tt.reference_type = 'cashier_shift'
        and tt.reference_id = ${shiftId}
        and tt.return_document_id is null
    `.execute(this.db);

    return this.toMoney(result.rows?.[0]?.cash_drawer_movement_total || 0);
  }

  private async computeShiftServiceBreakdown(shift: ShiftRow): Promise<ShiftServiceBreakdown> {
    const openerId = Number(shift.opened_by || 0);
    if (!(openerId > 0) || !shift.created_at) {
      return { serviceCashTotal: 0, serviceCardTotal: 0, serviceTotal: 0 };
    }

    const result = await sql<ShiftServiceBreakdownRow>`
      select
        coalesce(sum(case when coalesce(s.payment_channel, 'cash') = 'cash' then s.amount else 0 end), 0) as service_cash_total,
        coalesce(sum(case when coalesce(s.payment_channel, 'cash') = 'card' then s.amount else 0 end), 0) as service_card_total,
        coalesce(sum(s.amount), 0) as service_total
      from services s
      where s.created_by = ${openerId}
        and s.service_date >= ${shift.created_at}
        and (${shift.closed_at || null}::timestamptz is null or s.service_date <= ${shift.closed_at || null})
        and (${shift.branch_id || null}::int is null or s.branch_id is null or s.branch_id = ${Number(shift.branch_id || 0) || null})
        and (${shift.location_id || null}::int is null or s.location_id is null or s.location_id = ${Number(shift.location_id || 0) || null})
    `.execute(this.db);

    const row = result.rows?.[0] || {};
    return {
      serviceCashTotal: this.toMoney(row.service_cash_total || 0),
      serviceCardTotal: this.toMoney(row.service_card_total || 0),
      serviceTotal: this.toMoney(row.service_total || 0),
    };
  }

  private async computeShiftSalesBreakdown(shift: ShiftRow): Promise<ShiftSalesBreakdown> {
    const openerId = Number(shift.opened_by || 0);
    if (!(openerId > 0) || !shift.created_at) {
      return {
        cashSalesTotal: 0,
        cardSalesTotal: 0,
        walletSalesTotal: 0,
        instapaySalesTotal: 0,
        creditSalesTotal: 0,
        shiftSalesTotal: 0,
        saleCount: 0,
        mixedSalesCount: 0,
        cardOperationCount: 0,
        walletOperationCount: 0,
        instapayOperationCount: 0,
      };
    }

    const result = await sql<ShiftSalesBreakdownRow>`
      with shift_sales as (
        select
          s.id,
          s.total,
          s.payment_type,
          s.payment_channel
        from sales s
        where s.status = 'posted'
          and s.created_by = ${openerId}
          and s.created_at >= ${shift.created_at}
          and (${shift.closed_at || null}::timestamptz is null or s.created_at <= ${shift.closed_at || null})
          and (${shift.branch_id || null}::int is null or s.branch_id is null or s.branch_id = ${Number(shift.branch_id || 0) || null})
          and (${shift.location_id || null}::int is null or s.location_id is null or s.location_id = ${Number(shift.location_id || 0) || null})
      ),
      payment_rows as (
        select
          sp.sale_id,
          sp.payment_channel,
          sp.amount
        from sale_payments sp
        inner join shift_sales ss on ss.id = sp.sale_id

        union all

        select
          ss.id as sale_id,
          case
            when ss.payment_channel in ('card', 'wallet', 'instapay') then ss.payment_channel
            else 'cash'
          end as payment_channel,
          ss.total as amount
        from shift_sales ss
        where ss.payment_channel in ('cash', 'card', 'wallet', 'instapay')
          and not exists (select 1 from sale_payments sp where sp.sale_id = ss.id)
      )
      select
        coalesce(sum(case when payment_rows.payment_channel = 'cash' then payment_rows.amount else 0 end), 0) as cash_sales_total,
        coalesce(sum(case when payment_rows.payment_channel = 'card' then payment_rows.amount else 0 end), 0) as card_sales_total,
        coalesce(sum(case when payment_rows.payment_channel = 'wallet' then payment_rows.amount else 0 end), 0) as wallet_sales_total,
        coalesce(sum(case when payment_rows.payment_channel = 'instapay' then payment_rows.amount else 0 end), 0) as instapay_sales_total,
        coalesce((select sum(ss.total) from shift_sales ss where ss.payment_type = 'credit' or ss.payment_channel = 'credit'), 0) as credit_sales_total,
        coalesce((select sum(ss.total) from shift_sales ss), 0) as shift_sales_total,
        coalesce((select count(*) from shift_sales ss), 0)::int as sale_count,
        coalesce((select count(*) from shift_sales ss where ss.payment_channel = 'mixed'), 0)::int as mixed_sale_count,
        coalesce(sum(case when payment_rows.payment_channel = 'card' then 1 else 0 end), 0)::int as card_operation_count,
        coalesce(sum(case when payment_rows.payment_channel = 'wallet' then 1 else 0 end), 0)::int as wallet_operation_count,
        coalesce(sum(case when payment_rows.payment_channel = 'instapay' then 1 else 0 end), 0)::int as instapay_operation_count
      from payment_rows
    `.execute(this.db);

    const row = result.rows?.[0] || {};
    return {
      cashSalesTotal: this.toMoney(row.cash_sales_total || 0),
      cardSalesTotal: this.toMoney(row.card_sales_total || 0),
      walletSalesTotal: this.toMoney(row.wallet_sales_total || 0),
      instapaySalesTotal: this.toMoney(row.instapay_sales_total || 0),
      creditSalesTotal: this.toMoney(row.credit_sales_total || 0),
      shiftSalesTotal: this.toMoney(row.shift_sales_total || 0),
      saleCount: Number(row.sale_count || 0),
      mixedSalesCount: Number(row.mixed_sale_count || 0),
      cardOperationCount: Number(row.card_operation_count || 0),
      walletOperationCount: Number(row.wallet_operation_count || 0),
      instapayOperationCount: Number(row.instapay_operation_count || 0),
    };
  }


  private async computeShiftSaleReturnTotals(shift: ShiftRow): Promise<ShiftSaleReturnTotals> {
    const openerId = Number(shift.opened_by || 0);
    if (!(openerId > 0) || !shift.created_at) {
      return { saleReturnCashRefundTotal: 0, saleReturnCardRefundTotal: 0, saleReturnTotal: 0 };
    }

    const result = await sql<ShiftSaleReturnTotalsRow>`
      select
        coalesce(sum(case when rd.refund_method = 'cash' then rd.total else 0 end), 0) as sale_return_cash_refund_total,
        coalesce(sum(case when rd.refund_method = 'card' then rd.total else 0 end), 0) as sale_return_card_refund_total,
        coalesce(sum(rd.total), 0) as sale_return_total
      from return_documents rd
      where rd.return_type = 'sale'
        and rd.created_by = ${openerId}
        and rd.created_at >= ${shift.created_at}
        and (${shift.closed_at || null}::timestamptz is null or rd.created_at <= ${shift.closed_at || null})
        and (${shift.branch_id || null}::int is null or rd.branch_id is null or rd.branch_id = ${Number(shift.branch_id || 0) || null})
        and (${shift.location_id || null}::int is null or rd.location_id is null or rd.location_id = ${Number(shift.location_id || 0) || null})
    `.execute(this.db);

    const row = result.rows?.[0] || {};
    return {
      saleReturnCashRefundTotal: this.toMoney(row.sale_return_cash_refund_total || 0),
      saleReturnCardRefundTotal: this.toMoney(row.sale_return_card_refund_total || 0),
      saleReturnTotal: this.toMoney(row.sale_return_total || 0),
    };
  }

  private async computeShiftExpectedCashFromShift(shift: ShiftRow, salesBreakdown?: ShiftSalesBreakdown, serviceBreakdown?: ShiftServiceBreakdown): Promise<number> {
    const shiftId = Number(shift.id || 0);
    if (!(shiftId > 0)) return this.toMoney(shift.opening_cash || 0);

    const cashDrawerMovementTotal = await this.computeShiftCashDrawerMovementTotal(shiftId);
    const breakdown = salesBreakdown || await this.computeShiftSalesBreakdown(shift);
    const services = serviceBreakdown || await this.computeShiftServiceBreakdown(shift);
    const saleReturnTotals = await this.computeShiftSaleReturnTotals(shift);
    return this.toMoney(Number(shift.opening_cash || 0) + cashDrawerMovementTotal + breakdown.cashSalesTotal + services.serviceCashTotal - saleReturnTotals.saleReturnCashRefundTotal);
  }

  private async hydrateShiftRow(row: ShiftRow): Promise<ShiftRow> {
    const shiftId = Number(row.id || 0);
    if (!(shiftId > 0)) return row;

    const salesBreakdown = await this.computeShiftSalesBreakdown(row);
    const serviceBreakdown = await this.computeShiftServiceBreakdown(row);
    const cashDrawerMovementTotal = await this.computeShiftCashDrawerMovementTotal(shiftId);
    const saleReturnTotals = await this.computeShiftSaleReturnTotals(row);
    const expectedCash = String(row.status || 'open') === 'open'
      ? this.toMoney(Number(row.opening_cash || 0) + cashDrawerMovementTotal + salesBreakdown.cashSalesTotal + serviceBreakdown.serviceCashTotal - saleReturnTotals.saleReturnCashRefundTotal)
      : Number(row.expected_cash || 0);

    return {
      ...row,
      expected_cash: expectedCash,
      cash_sales_total: salesBreakdown.cashSalesTotal,
      card_sales_total: salesBreakdown.cardSalesTotal,
      wallet_sales_total: salesBreakdown.walletSalesTotal,
      instapay_sales_total: salesBreakdown.instapaySalesTotal,
      credit_sales_total: salesBreakdown.creditSalesTotal,
      shift_sales_total: salesBreakdown.shiftSalesTotal,
      sale_count: salesBreakdown.saleCount,
      mixed_sale_count: salesBreakdown.mixedSalesCount,
      card_operation_count: salesBreakdown.cardOperationCount,
      wallet_operation_count: salesBreakdown.walletOperationCount,
      instapay_operation_count: salesBreakdown.instapayOperationCount,
      cash_drawer_movement_total: cashDrawerMovementTotal,
      service_cash_total: serviceBreakdown.serviceCashTotal,
      service_card_total: serviceBreakdown.serviceCardTotal,
      service_total: serviceBreakdown.serviceTotal,
      sale_return_cash_refund_total: saleReturnTotals.saleReturnCashRefundTotal,
      sale_return_card_refund_total: saleReturnTotals.saleReturnCardRefundTotal,
      sale_return_total: saleReturnTotals.saleReturnTotal,
    };
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
    const hydratedRows = await Promise.all(rows.map((row) => this.hydrateShiftRow(row)));

    return hydratedRows.map((row) => mapCashDrawerShiftRow(row));
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

    return this.computeShiftExpectedCashFromShift(shift);
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
    payload: {
      countedCash?: number;
      cardDeclaredTotal?: number;
      cardOperationCount?: number;
      walletDeclaredTotal?: number;
      walletOperationCount?: number;
      instapayDeclaredTotal?: number;
      instapayOperationCount?: number;
      cardDetails?: Array<{ amount?: number; reference?: string }>;
      walletDetails?: Array<{ amount?: number; reference?: string }>;
      instapayDetails?: Array<{ amount?: number; reference?: string }>;
      note?: string;
      managerPin?: string;
    },
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
    const role = String(auth.role || '').trim();
    const isBlindCloseCashier = role === 'cashier';

    assertCashDrawerCountedCash(countedCash);

    await this.assertCurrentUserPassword(String(payload.managerPin || '').trim(), auth);

    const expectedCash = await this.computeShiftExpectedCash(shiftId);
    const variance = computeCashDrawerVariance(countedCash, expectedCash);

    if (!isBlindCloseCashier && Math.abs(variance) >= 0.01) {
      assertCashDrawerNote(note);
    }

    const cardOperationCount = this.normalizeOperationCount(payload.cardOperationCount);
    const walletOperationCount = this.normalizeOperationCount(payload.walletOperationCount);
    const instapayOperationCount = this.normalizeOperationCount(payload.instapayOperationCount);

    const cardDeclaredTotal = this.toMoney(payload.cardDeclaredTotal || 0);
    const walletDeclaredTotal = this.toMoney(payload.walletDeclaredTotal || 0);
    const instapayDeclaredTotal = this.toMoney(payload.instapayDeclaredTotal || 0);

    const cardDetails = this.normalizeOperationDetails(payload.cardDetails, cardOperationCount);
    const walletDetails = this.normalizeOperationDetails(payload.walletDetails, walletOperationCount);
    const instapayDetails = this.normalizeOperationDetails(payload.instapayDetails, instapayOperationCount);

    const blindCloseMeta: BlindCloseMetadata | null = isBlindCloseCashier ? {
      blindClose: true,
      declared: {
        cash: this.toMoney(countedCash),
        cardTotal: cardDeclaredTotal,
        cardCount: cardOperationCount,
        walletTotal: walletDeclaredTotal,
        walletCount: walletOperationCount,
        instapayTotal: instapayDeclaredTotal,
        instapayCount: instapayOperationCount,
      },
      detailTotals: {
        card: this.toMoney(cardDetails.reduce((sum, row) => sum + row.amount, 0)),
        wallet: this.toMoney(walletDetails.reduce((sum, row) => sum + row.amount, 0)),
        instapay: this.toMoney(instapayDetails.reduce((sum, row) => sum + row.amount, 0)),
      },
      details: {
        card: cardDetails,
        wallet: walletDetails,
        instapay: instapayDetails,
      },
      note,
    } : null;

    const closeStatus = isBlindCloseCashier ? 'pending_review' : 'closed';
    const closeNoteValue = blindCloseMeta ? this.serializeBlindCloseNote(blindCloseMeta) : note;

    await sql`
      update cashier_shifts
      set
        status = ${closeStatus},
        expected_cash = ${expectedCash},
        counted_cash = ${countedCash},
        variance = ${variance},
        close_note = ${closeNoteValue},
        closed_by = ${auth.userId},
        closed_at = now()
      where id = ${shiftId}
    `.execute(this.db);

    const listing = await this.listCashierShifts({}, auth);
    return { ok: true, cashierShifts: listing.cashierShifts, pagination: listing.pagination, summary: listing.summary };
  }

  async reviewCashierShiftClose(
    shiftId: number,
    payload: { note?: string },
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    if (!(shiftId > 0)) {
      throw new AppError('الوردية غير موجودة', 'SHIFT_NOT_FOUND', 404);
    }

    if (!this.canReviewPendingShift(auth)) {
      throw new AppError('غير مسموح لك بمراجعة إغلاق الوردية', 'SHIFT_REVIEW_FORBIDDEN', 403);
    }

    const shift = await this.getShift(shiftId);
    if (!shift) {
      throw new AppError('الوردية غير موجودة', 'SHIFT_NOT_FOUND', 404);
    }

    if (String(shift.status || '') !== 'pending_review') {
      throw new AppError('الوردية ليست في انتظار مراجعة المدير', 'SHIFT_NOT_PENDING_REVIEW', 400);
    }

    const managerNote = String(payload.note || '').trim();
    const rawCloseNote = String(shift.close_note || '');
    const parsedBlindClose = this.parseBlindCloseNote(rawCloseNote);
    const reviewedAt = new Date().toISOString();

    let closeNoteValue = rawCloseNote;
    if (parsedBlindClose) {
      parsedBlindClose.managerReview = {
        note: managerNote,
        reviewedById: Number(auth.userId || 0),
        reviewedByName: String(auth.username || ''),
        reviewedAt,
      };
      closeNoteValue = this.serializeBlindCloseNote(parsedBlindClose);
    } else if (managerNote) {
      closeNoteValue = rawCloseNote
        ? `${rawCloseNote}\n\nملاحظة مراجعة المدير: ${managerNote}`
        : `ملاحظة مراجعة المدير: ${managerNote}`;
    }

    await sql`
      update cashier_shifts
      set
        status = 'closed',
        close_note = ${closeNoteValue},
        closed_by = coalesce(closed_by, ${auth.userId}),
        closed_at = coalesce(closed_at, now()),
        updated_at = now()
      where id = ${shiftId}
    `.execute(this.db);

    const listing = await this.listCashierShifts({}, auth);
    return { ok: true, cashierShifts: listing.cashierShifts, pagination: listing.pagination, summary: listing.summary };
  }
}
