import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { buildPagination, getPagination, parseRange } from '../helpers/reports-range.helper';
import { toMoney } from '../helpers/reports-math.helper';

@Injectable()
export class ReportsAdminService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async treasuryTransactions(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    const { page, pageSize } = getPagination(query, 25);

    let countQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);

    let rowsQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .select(['t.id', 't.txn_type', 't.amount', 't.note', 't.reference_type', 't.reference_id', 't.branch_id', 't.location_id', 't.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);

    let summaryQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);

    if (query.branchId) { countQuery = countQuery.where('t.branch_id', '=', Number(query.branchId)); rowsQuery = rowsQuery.where('t.branch_id', '=', Number(query.branchId)); summaryQuery = summaryQuery.where('t.branch_id', '=', Number(query.branchId)); }
    if (query.locationId) { countQuery = countQuery.where('t.location_id', '=', Number(query.locationId)); rowsQuery = rowsQuery.where('t.location_id', '=', Number(query.locationId)); summaryQuery = summaryQuery.where('t.location_id', '=', Number(query.locationId)); }
    if (filter === 'in') { countQuery = countQuery.where('t.amount', '>', 0); rowsQuery = rowsQuery.where('t.amount', '>', 0); summaryQuery = summaryQuery.where('t.amount', '>', 0); }
    if (filter === 'out') { countQuery = countQuery.where('t.amount', '<', 0); rowsQuery = rowsQuery.where('t.amount', '<', 0); summaryQuery = summaryQuery.where('t.amount', '<', 0); }
    if (search) {
      const pattern = `%${search}%`;
      const applySearch = (qb: any) => qb.where((eb: any) => eb.or([
        eb(sql`lower(coalesce(t.txn_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(t.note, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(t.reference_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(u.username, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(b.name, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(l.name, ''))`, 'like', pattern),
      ]));
      countQuery = applySearch(countQuery);
      rowsQuery = applySearch(rowsQuery);
      summaryQuery = applySearch(summaryQuery);
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await rowsQuery.orderBy('t.id desc').limit(pageSize).offset((pagination.page - 1) * pageSize).execute();
    const summaryRow = await summaryQuery.select([
      sql<number>`coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0)`.as('cash_in'),
      sql<number>`coalesce(sum(case when t.amount < 0 then t.amount else 0 end), 0)`.as('cash_out'),
      sql<number>`coalesce(sum(t.amount), 0)`.as('net_total'),
    ]).executeTakeFirst();

    return {
      treasury: rows.map((row) => ({ id: String(row.id), type: row.txn_type || '', amount: Number(row.amount || 0), note: row.note || '', referenceType: row.reference_type || '', referenceId: row.reference_id ? String(row.reference_id) : '', branchId: row.branch_id ? String(row.branch_id) : '', locationId: row.location_id ? String(row.location_id) : '', branchName: (row as any).branch_name || '', locationName: (row as any).location_name || '', createdBy: (row as any).created_by_name || '', date: row.created_at })),
      pagination,
      summary: { cashIn: toMoney((summaryRow as { cash_in?: number | string | null } | undefined)?.cash_in ?? 0), cashOut: Math.abs(toMoney((summaryRow as { cash_out?: number | string | null } | undefined)?.cash_out ?? 0)), net: toMoney((summaryRow as { net_total?: number | string | null } | undefined)?.net_total ?? 0) },
    };
  }

  async auditLogs(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('audit') && auth.role !== 'super_admin') throw new AppError('Missing required permissions', 'FORBIDDEN', 403);
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const search = String(query.search || '').trim().toLowerCase();
    const { page, pageSize } = getPagination(query, 50);

    let countQuery = this.db.selectFrom('audit_logs as a').leftJoin('users as u', 'u.id', 'a.created_by').where('a.created_at', '>=', fromDate).where('a.created_at', '<=', toDate);
    let rowsQuery = this.db.selectFrom('audit_logs as a').leftJoin('users as u', 'u.id', 'a.created_by').select(['a.id', 'a.action', 'a.details', 'a.created_at', 'u.username']).where('a.created_at', '>=', fromDate).where('a.created_at', '<=', toDate);
    let distinctUsersQuery = this.db.selectFrom('audit_logs as a').leftJoin('users as u', 'u.id', 'a.created_by').where('a.created_at', '>=', fromDate).where('a.created_at', '<=', toDate);
    if (search) {
      const pattern = `%${search}%`;
      const applySearch = (qb: any) => qb.where((eb: any) => eb.or([
        eb(sql`lower(coalesce(a.action, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(a.details, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(u.username, ''))`, 'like', pattern),
      ]));
      countQuery = applySearch(countQuery);
      rowsQuery = applySearch(rowsQuery);
      distinctUsersQuery = applySearch(distinctUsersQuery);
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await rowsQuery.orderBy('a.id desc').limit(pageSize).offset((pagination.page - 1) * pageSize).execute();
    const distinctUsersRow = await distinctUsersQuery.select(sql<number>`count(distinct coalesce(u.username, 'guest'))`.as('count')).executeTakeFirst();

    return {
      auditLogs: rows.map((row) => ({ id: String(row.id), action: row.action || '', details: row.details || '', user: (row as any).username || '', date: row.created_at, createdByName: (row as any).username || '' })),
      pagination,
      summary: { totalItems, distinctUsers: Number((distinctUsersRow as { count?: number | string | null } | undefined)?.count || 0) },
    };
  }
}
