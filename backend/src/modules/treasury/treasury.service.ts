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
import { CreateTreasuryTransferDto } from './dto/create-treasury-transfer.dto';
import { AppError } from '../../common/errors/app-error';
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

    const lastSeenId = Math.max(0, Number(query.lastSeenId || query.lastId || query.cursor || 0));
    const safeOffset = lastSeenId > 0 ? 0 : offset;

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
            ${lastSeenId > 0 ? sql`AND e.id < ${lastSeenId}` : sql``}
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
          LIMIT ${pageSize} OFFSET ${safeOffset}
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
            ${lastSeenId > 0 ? sql`AND e.id < ${lastSeenId}` : sql``}
          )
          SELECT *, COUNT(*) OVER() as total_count, SUM(amount) OVER() as total_amount
          FROM filtered_expenses
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${safeOffset}
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
    const nextCursor = result.rows.length === pageSize ? String(result.rows[result.rows.length - 1].id) : null;

    return {
      expenses: rows,
      pagination: { page, pageSize, totalItems, totalPages, nextCursor },
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
        INSERT INTO expenses (title, amount, expense_date, note, branch_id, location_id, cost_center_id, created_by, tenant_id, account_id)
        VALUES (
          ${String(payload.title || '').trim()},
          ${Number(payload.amount || 0)},
          ${new Date(payload.date)},
          ${String(payload.note || '').trim()},
          ${payload.branchId ? Number(payload.branchId) : null},
          ${payload.locationId ? Number(payload.locationId) : null},
          ${payload.costCenterId ? Number(payload.costCenterId) : null},
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
      if (!accountingResult.journalEntryId) throw new Error(`Expense ${expenseId} has no journal entry`);
      if (accountingResult.posted) {
        this.logger.log(`Posted expense journal for expense ${expenseId} with entry ${accountingResult.journalEntryId}`);
      } else {
        this.logger.warn(`Skipped expense journal posting for expense ${expenseId}; existing entry ${accountingResult.journalEntryId ?? 'none'}`);
      }
    });

    await this.audit.log('تسجيل مصروف', 'تم تسجيل مصروف بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listExpenses({}, auth)) };
  }

  async createTransfer(payload: CreateTreasuryTransferDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const fromAccountId = Number(payload.fromAccountId);
    const toAccountId = Number(payload.toAccountId);
    const amount = Number(Number(payload.amount).toFixed(2));
    const requestKey = String(payload.requestKey || '').trim();
    if (!Number.isInteger(fromAccountId) || !Number.isInteger(toAccountId) || fromAccountId === toAccountId) {
      throw new AppError('Source and destination accounts must be different valid accounts', 'INVALID_TRANSFER_ACCOUNTS', 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Transfer amount must be greater than zero', 'INVALID_TRANSFER_AMOUNT', 400);
    }
    if (requestKey.length < 8 || requestKey.length > 160) {
      throw new AppError('A stable transfer request key is required', 'TRANSFER_REQUEST_KEY_REQUIRED', 400);
    }

    const result = await this.tx.runInTransaction(this.db, async (trx) => {
      // Idempotency is checked under a row lock. A retry after a committed request
      // returns the original transfer instead of creating a second ledger movement.
      const existing = await sql<{
        id: number;
        from_account_id: number;
        to_account_id: number;
        amount: number;
        journal_entry_id: number | null;
      }>`
        SELECT id, from_account_id, to_account_id, amount, journal_entry_id
        FROM treasury_transfers
        WHERE tenant_id = ${scope.tenantId} AND request_key = ${requestKey}
        FOR UPDATE
      `.execute(trx);
      const prior = existing.rows[0];
      if (prior) {
        if (Number(prior.from_account_id) !== fromAccountId
          || Number(prior.to_account_id) !== toAccountId
          || Number(prior.amount) !== amount) {
          throw new AppError('Transfer request key was already used with different data', 'TRANSFER_IDEMPOTENCY_CONFLICT', 409);
        }
        return { transferId: Number(prior.id), journalEntryId: Number(prior.journal_entry_id || 0), idempotent: true };
      }

      // Lock both accounts in one canonical order. This is the only lock order
      // used for treasury transfers, so A->B and B->A cannot deadlock.
      const orderedAccountIds = [fromAccountId, toAccountId].sort((a, b) => a - b);
      const accounts = await trx
        .selectFrom('accounting_accounts')
        .select(['id', 'name_ar'])
        .where('tenant_id', '=', scope.tenantId)
        .where('id', 'in', orderedAccountIds)
        .where('account_type', '=', 'asset')
        .where('normal_balance', '=', 'debit')
        .where('is_cash_bank', '=', true)
        .where('is_active', '=', true)
        .forUpdate()
        .orderBy('id', 'asc')
        .execute();
      if (accounts.length !== 2) {
        throw new AppError('Both accounts must be active cash or bank accounts in this tenant', 'TREASURY_ACCOUNT_NOT_FOUND', 400);
      }

      const balanceResult = await sql<{ balance: string }>`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0)::numeric AS balance
        FROM journal_entry_lines jel
        INNER JOIN journal_entries je
          ON je.id = jel.journal_entry_id AND je.tenant_id = ${scope.tenantId}
        WHERE jel.tenant_id = ${scope.tenantId}
          AND jel.account_id = ${fromAccountId}
          AND je.status = 'posted'
      `.execute(trx);
      const available = Number(balanceResult.rows[0]?.balance || 0);
      if (available + 0.001 < amount) {
        throw new AppError(`Insufficient balance in source treasury (available ${available.toFixed(2)})`, 'INSUFFICIENT_TREASURY_BALANCE', 400);
      }

      const inserted = await sql<{ id: number }>`
        INSERT INTO treasury_transfers
          (tenant_id, account_id, from_account_id, to_account_id, amount, note, request_key, created_by)
        VALUES
          (${scope.tenantId}, ${scope.accountId}, ${fromAccountId}, ${toAccountId}, ${amount},
           ${String(payload.note || '').trim()}, ${requestKey}, ${auth.userId})
        RETURNING id
      `.execute(trx);
      const transferId = Number(inserted.rows[0]?.id || 0);
      if (!transferId) throw new AppError('Treasury transfer could not be created', 'TRANSFER_CREATE_FAILED', 500);

      const journalEntryId = await this.accountingPosting.postDomainJournal(trx, {
        sourceType: 'treasury_transfer',
        sourceId: transferId,
        tenantId: scope.tenantId,
        accountId: scope.accountId,
        entryDate: new Date(),
        description: String(payload.note || `تحويل خزينة إلى الحساب ${toAccountId}`).trim(),
        branchId: null,
        locationId: null,
        createdBy: auth.userId,
        postedBy: auth.userId,
        lines: [
          { accountId: toAccountId, description: 'استلام تحويل خزينة', debit: amount, credit: 0, partnerType: 'none', partnerId: null, branchId: null, locationId: null },
          { accountId: fromAccountId, description: 'إرسال تحويل خزينة', debit: 0, credit: amount, partnerType: 'none', partnerId: null, branchId: null, locationId: null },
        ],
      });

      await sql`
        UPDATE treasury_transfers
        SET journal_entry_id = ${journalEntryId}
        WHERE id = ${transferId} AND tenant_id = ${scope.tenantId}
      `.execute(trx);

      await trx.insertInto('treasury_transactions').values([
        {
          txn_type: 'transfer_out', amount: -amount, note: String(payload.note || '').trim(),
          reference_type: 'treasury_transfer', reference_id: transferId, return_document_id: null,
          branch_id: null, location_id: null, created_by: auth.userId,
          tenant_id: scope.tenantId, account_id: scope.accountId,
        },
        {
          txn_type: 'transfer_in', amount, note: String(payload.note || '').trim(),
          reference_type: 'treasury_transfer', reference_id: transferId, return_document_id: null,
          branch_id: null, location_id: null, created_by: auth.userId,
          tenant_id: scope.tenantId, account_id: scope.accountId,
        },
      ]).execute();

      return { transferId, journalEntryId, idempotent: false };
    });

    if (!result.idempotent) {
      await this.audit.log('تحويل خزينة', `تم تحويل مبلغ ${amount.toFixed(2)} بين حسابين`, auth);
    }
    return { ok: true, ...result };
  }
}
