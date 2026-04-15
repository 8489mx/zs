import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { AuditLogRow, buildAuditPayload, buildTreasuryPayload, TreasurySummaryRow, TreasuryTransactionRow } from '../helpers/reports-ops.helper';
import { applyAuditSearch, applySignedAmountFilter, applyTreasurySearch } from '../helpers/reports-query-pipeline.helper';
import { buildReportListState } from '../helpers/reports-query.helper';

@Injectable()
export class ReportsAdminService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async treasuryTransactions(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const { fromDate, toDate, searchPattern, filter, page, pageSize, offset } = buildReportListState(query, 25);

    let countQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .where('t.created_at', '>=', fromDate!)
      .where('t.created_at', '<=', toDate!);

    let rowsQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .select([
        't.id',
        't.txn_type',
        't.amount',
        't.note',
        't.reference_type',
        't.reference_id',
        't.branch_id',
        't.location_id',
        't.created_at',
        'b.name as branch_name',
        'l.name as location_name',
        'u.username as created_by_name',
      ])
      .where('t.created_at', '>=', fromDate!)
      .where('t.created_at', '<=', toDate!);

    let summaryQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .where('t.created_at', '>=', fromDate!)
      .where('t.created_at', '<=', toDate!);

    if (query.branchId) {
      const branchId = Number(query.branchId);
      countQuery = countQuery.where('t.branch_id', '=', branchId);
      rowsQuery = rowsQuery.where('t.branch_id', '=', branchId);
      summaryQuery = summaryQuery.where('t.branch_id', '=', branchId);
    }
    if (query.locationId) {
      const locationId = Number(query.locationId);
      countQuery = countQuery.where('t.location_id', '=', locationId);
      rowsQuery = rowsQuery.where('t.location_id', '=', locationId);
      summaryQuery = summaryQuery.where('t.location_id', '=', locationId);
    }

    countQuery = applySignedAmountFilter(countQuery, 't.amount', filter);
    rowsQuery = applySignedAmountFilter(rowsQuery, 't.amount', filter);
    summaryQuery = applySignedAmountFilter(summaryQuery, 't.amount', filter);

    countQuery = applyTreasurySearch(countQuery, searchPattern);
    rowsQuery = applyTreasurySearch(rowsQuery, searchPattern);
    summaryQuery = applyTreasurySearch(summaryQuery, searchPattern);

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const rows = await rowsQuery.orderBy('t.id desc').limit(pageSize).offset(offset).execute();
    const summaryRow = await summaryQuery
      .select([
        sql<number>`coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0)`.as('cash_in'),
        sql<number>`coalesce(sum(case when t.amount < 0 then t.amount else 0 end), 0)`.as('cash_out'),
        sql<number>`coalesce(sum(t.amount), 0)`.as('net_total'),
      ])
      .executeTakeFirst();

    return buildTreasuryPayload({
      rows: rows as TreasuryTransactionRow[],
      page,
      pageSize,
      totalItems,
      summaryRow: summaryRow as TreasurySummaryRow | null,
    });
  }

  async auditLogs(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('audit') && auth.role !== 'super_admin') {
      throw new AppError('Missing required permissions', 'FORBIDDEN', 403);
    }

    const { fromDate, toDate, searchPattern, page, pageSize, offset } = buildReportListState(query, 50, { defaultFilter: '' });

    let countQuery = this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .where('a.created_at', '>=', fromDate!)
      .where('a.created_at', '<=', toDate!);

    let rowsQuery = this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select(['a.id', 'a.action', 'a.details', 'a.created_at', 'u.username'])
      .where('a.created_at', '>=', fromDate!)
      .where('a.created_at', '<=', toDate!);

    let distinctUsersQuery = this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .where('a.created_at', '>=', fromDate!)
      .where('a.created_at', '<=', toDate!);

    countQuery = applyAuditSearch(countQuery, searchPattern);
    rowsQuery = applyAuditSearch(rowsQuery, searchPattern);
    distinctUsersQuery = applyAuditSearch(distinctUsersQuery, searchPattern);

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const rows = await rowsQuery.orderBy('a.id desc').limit(pageSize).offset(offset).execute();
    const distinctUsersRow = await distinctUsersQuery
      .select(sql<number>`count(distinct coalesce(u.username, 'guest'))`.as('count'))
      .executeTakeFirst();

    return buildAuditPayload({
      rows: rows as AuditLogRow[],
      page,
      pageSize,
      totalItems,
      distinctUsers: Number((distinctUsersRow as { count?: number | string | null } | undefined)?.count || 0),
    });
  }
}
