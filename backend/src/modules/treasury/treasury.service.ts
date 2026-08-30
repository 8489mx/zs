import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { paginateRows } from '../../common/utils/pagination';

@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  async listExpenses(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const search = String(query.search || '').trim();
    const searchPattern = search ? `%${search}%` : null;
    
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    const querySql = search 
      ? sql`
          WITH filtered_expenses AS (
            SELECT
              e.id, e.title, e.amount, e.expense_date, e.note, e.branch_id, e.location_id,
              b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
            FROM expenses e
            LEFT JOIN branches b ON b.id = e.branch_id AND b.tenant_id = ${scope.tenantId}
            LEFT JOIN stock_locations l ON l.id = e.location_id AND l.tenant_id = ${scope.tenantId}
            LEFT JOIN users u ON u.id = e.created_by AND u.tenant_id = ${scope.tenantId}
            WHERE e.tenant_id = ${scope.tenantId}
            AND (
              e.title ILIKE ${searchPattern} OR
              e.note ILIKE ${searchPattern} OR
              u.username ILIKE ${searchPattern} OR
              b.name ILIKE ${searchPattern} OR
              l.name ILIKE ${searchPattern}
            )
          )
          SELECT *, COUNT(*) OVER() as total_count, SUM(amount) OVER() as total_amount
          FROM filtered_expenses
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `
      : sql`
          WITH filtered_expenses AS (
            SELECT
              e.id, e.title, e.amount, e.expense_date, e.note, e.branch_id, e.location_id,
              b.name AS branch_name, l.name AS location_name, u.username AS created_by_name
            FROM expenses e
            LEFT JOIN branches b ON b.id = e.branch_id AND b.tenant_id = ${scope.tenantId}
            LEFT JOIN stock_locations l ON l.id = e.location_id AND l.tenant_id = ${scope.tenantId}
            LEFT JOIN users u ON u.id = e.created_by AND u.tenant_id = ${scope.tenantId}
            WHERE e.tenant_id = ${scope.tenantId}
          )
          SELECT *, COUNT(*) OVER() as total_count, SUM(amount) OVER() as total_amount
          FROM filtered_expenses
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;

    const result = await querySql.execute(this.db) as any;

    let rows = result.rows.map((row: any) => ({
      id: String(row.id),
      title: row.title || '',
      amount: Number(row.amount || 0),
      date: row.expense_date,
      note: row.note || '',
      createdBy: row.created_by_name || '',
      branchId: row.branch_id ? String(row.branch_id) : '',
      branchName: row.branch_name || '',
      locationId: row.location_id ? String(row.location_id) : '',
      locationName: row.location_name || '',
    }));

    const totalItems = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    const totalAmount = result.rows.length > 0 ? Number(result.rows[0].total_amount) : 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      expenses: rows,
      pagination: { page, pageSize, totalItems, totalPages },
      summary: {
        totalItems,
        totalAmount: Number(totalAmount.toFixed(2)),
      },
      scope,
    };
  }

  async createExpense(payload: CreateExpenseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const insert = await sql<{ id: number }>`
        INSERT INTO expenses (title, amount, expense_date, note, branch_id, location_id, created_by, tenant_id, account_id)
        VALUES (
          ${String(payload.title || '').trim()},
          ${Number(payload.amount || 0)},
          ${new Date(payload.date)},
          ${String(payload.note || '').trim()},
          ${payload.branchId ? Number(payload.branchId) : null},
          ${payload.locationId ? Number(payload.locationId) : null},
          ${auth.userId},
          ${scope.tenantId},
          ${scope.accountId}
        )
        RETURNING id
      `.execute(trx);

      const expenseId = Number(insert.rows[0]?.id || 0);

      await trx.insertInto('treasury_transactions').values({
        txn_type: 'expense',
        amount: -Number(payload.amount || 0),
        note: 'مصروف: ' + String(payload.title || '').trim(),
        reference_type: 'expense',
        reference_id: expenseId,
        branch_id: payload.branchId ? Number(payload.branchId) : null,
        location_id: payload.locationId ? Number(payload.locationId) : null,
        created_by: auth.userId,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      }).execute();

      // Source-of-truth accounting post is the expense document itself.
      // Treasury transaction is an operational cash movement side-effect for the same expense.
      const accountingResult = await this.accountingPosting.postExpense(trx, expenseId, auth);
      if (accountingResult.posted) {
        this.logger.log(`Posted expense journal for expense ${expenseId} with entry ${accountingResult.journalEntryId}`);
      } else {
        this.logger.warn(`Skipped expense journal posting for expense ${expenseId}; existing entry ${accountingResult.journalEntryId ?? 'none'}`);
      }
    });

    await this.audit.log('تسجيل مصروف', 'تم تسجيل مصروف بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listExpenses({}, auth)) };
  }
}
