import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { paginateRows } from '../../common/utils/pagination';

@Injectable()
export class TreasuryService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  async listExpenses(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const result = await sql<{
      id: number;
      title: string;
      amount: string | number;
      expense_date: string;
      note: string;
      branch_id: number | null;
      location_id: number | null;
      branch_name: string | null;
      location_name: string | null;
      created_by_name: string | null;
    }>`
      SELECT
        e.id,
        e.title,
        e.amount,
        e.expense_date,
        e.note,
        e.branch_id,
        e.location_id,
        b.name AS branch_name,
        l.name AS location_name,
        u.username AS created_by_name
      FROM expenses e
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN stock_locations l ON l.id = e.location_id
      LEFT JOIN users u ON u.id = e.created_by
      ORDER BY e.id DESC
    `.execute(this.db);

    const search = String(query.search || '').trim().toLowerCase();
    let rows = result.rows.map((row) => ({
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

    if (search) {
      rows = rows.filter((row) =>
        [row.title, row.note, row.createdBy, row.branchName, row.locationName]
          .some((value) => String(value || '').toLowerCase().includes(search)),
      );
    }

    const paged = paginateRows(rows, query, { defaultSize: 20, includeRange: true });

    return {
      expenses: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
      },
      scope,
    };
  }

  async createExpense(payload: CreateExpenseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const insert = await sql<{ id: number }>`
        INSERT INTO expenses (title, amount, expense_date, note, branch_id, location_id, created_by)
        VALUES (
          ${String(payload.title || '').trim()},
          ${Number(payload.amount || 0)},
          ${new Date(payload.date)},
          ${String(payload.note || '').trim()},
          ${payload.branchId ? Number(payload.branchId) : null},
          ${payload.locationId ? Number(payload.locationId) : null},
          ${auth.userId}
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
      }).execute();
    });

    await this.audit.log('تسجيل مصروف', 'تم تسجيل مصروف بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listExpenses({}, auth)) };
  }
}
