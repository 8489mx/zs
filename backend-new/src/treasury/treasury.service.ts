import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { TransactionHelper } from '../database/helpers/transaction.helper';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class TreasuryService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private paginate<T>(rows: T[], query: Record<string, unknown>, defaultSize = 20) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || defaultSize)));
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const rangeStart = totalItems ? start + 1 : 0;
    const rangeEnd = Math.min(totalItems, start + pageSize);
    return {
      rows: rows.slice(start, start + pageSize),
      pagination: { page: safePage, pageSize, totalItems, totalPages, rangeStart, rangeEnd },
    };
  }

  async listExpenses(query: Record<string, unknown>, _auth: AuthContext): Promise<Record<string, unknown>> {
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

    const paged = this.paginate(rows, query, 20);

    return {
      expenses: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
      },
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

    await this.audit.log('تسجيل مصروف', 'تم تسجيل مصروف بواسطة ' + auth.username, auth.userId);
    return { ok: true, ...(await this.listExpenses({}, auth)) };
  }
}
