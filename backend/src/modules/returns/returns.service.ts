import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { paginateRows } from '../../common/utils/pagination';
import { ensureReturnQtyWithinLimit } from '../../common/utils/financial-integrity';
import { applyStockDelta, previewConsumableStockQty } from '../../common/utils/location-stock-ledger';
import { normalizeReturnItems } from './helpers/return-payload.helper';
import { filterReturnRows, mapReturnRows, summarizeReturnRows } from './helpers/returns-listing.helper';
import { buildPurchaseReturnLine, buildSaleReturnLine, calculateNextLedgerBalance, calculateReturnDocumentTotal } from './helpers/returns-write.helper';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import { CreateReturnDto } from './dto/create-return.dto';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { IdempotencyService } from '../../core/idempotency/idempotency.service';
import { idempotencyStorage } from '../../core/idempotency/idempotency.context';
import { verifyPassword } from '../../core/auth/utils/password-hasher';

type ReturnInputItem = { productId: number; productName: string; qty: number; saleItemId?: number; purchaseItemId?: number };
type ReturnDocumentInput = { returnType: 'sale' | 'purchase'; invoiceId: number; settlementMode: string; refundMethod: string; total: number; note: string; branchId: number | null; locationId: number | null };

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly idempotency: IdempotencyService,
  ) {}

  private scope(auth: AuthContext) { return requireTenantScope(auth); }
  private tenantPredicate(auth: AuthContext, alias?: string) { const tenantId = this.scope(auth).tenantId; return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}` : sql<boolean>`tenant_id = ${tenantId}`; }
  private tenantFields(auth: AuthContext) { const scope = this.scope(auth); return { tenant_id: scope.tenantId, account_id: scope.accountId }; }

  private async findOwnOpenShift(trx: Kysely<Database>, auth: AuthContext): Promise<{ id: number; docNo: string } | null> {
    const shift = await trx.selectFrom('cashier_shifts').select(['id']).where('opened_by', '=', auth.userId).where('status', '=', 'open').where(this.tenantPredicate(auth)).orderBy('id', 'desc').executeTakeFirst();
    return shift?.id ? { id: Number(shift.id), docNo: `SHIFT-${shift.id}` } : null;
  }

  private async addTreasuryTransaction(trx: Kysely<Database>, txnType: string, amount: number, note: string, returnDocumentId: number, auth: AuthContext, branchId: number | null, locationId: number | null): Promise<void> {
    const currentShift = amount < 0 ? await this.findOwnOpenShift(trx, auth) : null;
    await trx.insertInto('treasury_transactions').values({ txn_type: txnType, amount, note: currentShift ? `${note} - ${currentShift.docNo}` : note, reference_type: currentShift ? 'cashier_shift' : 'return_document', reference_id: currentShift ? currentShift.id : returnDocumentId, return_document_id: returnDocumentId, branch_id: branchId, location_id: locationId, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
  }

  private async addCustomerLedgerEntry(trx: Kysely<Database>, customerId: number, amount: number, entryType: string, note: string, returnDocumentId: number, auth: AuthContext, branchId: number | null, locationId: number | null): Promise<void> {
    const customer = await trx.selectFrom('customers').select(['balance']).where('id', '=', customerId).where(this.tenantPredicate(auth)).executeTakeFirstOrThrow();
    const balanceAfter = calculateNextLedgerBalance(customer.balance, amount);
    await trx.insertInto('customer_ledger').values({ customer_id: customerId, entry_type: entryType, amount, balance_after: balanceAfter, note, reference_type: 'return_document', reference_id: returnDocumentId, return_document_id: returnDocumentId, branch_id: branchId, location_id: locationId, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
    await trx.updateTable('customers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', customerId).where(this.tenantPredicate(auth)).execute();
  }

  private async addSupplierLedgerEntry(trx: Kysely<Database>, supplierId: number, amount: number, entryType: string, note: string, returnDocumentId: number, auth: AuthContext, branchId: number | null, locationId: number | null): Promise<void> {
    const supplier = await trx.selectFrom('suppliers').select(['balance']).where('id', '=', supplierId).where(this.tenantPredicate(auth)).executeTakeFirstOrThrow();
    const balanceAfter = calculateNextLedgerBalance(supplier.balance, amount);
    await trx.insertInto('supplier_ledger').values({ supplier_id: supplierId, entry_type: entryType, amount, balance_after: balanceAfter, note, reference_type: 'return_document', reference_id: returnDocumentId, return_document_id: returnDocumentId, branch_id: branchId, location_id: locationId, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
    await trx.updateTable('suppliers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', supplierId).where(this.tenantPredicate(auth)).execute();
  }

  private async addStoreCredit(trx: Kysely<Database>, customerId: number, amount: number, auth: AuthContext): Promise<void> {
    const customer = await trx.selectFrom('customers').select(['store_credit_balance']).where('id', '=', customerId).where(this.tenantPredicate(auth)).executeTakeFirstOrThrow();
    const nextBalance = calculateNextLedgerBalance(customer.store_credit_balance, amount);
    await trx.updateTable('customers').set({ store_credit_balance: nextBalance, updated_at: sql`NOW()` }).where('id', '=', customerId).where(this.tenantPredicate(auth)).execute();
  }

  private async generateReturnDocNo(trx: Kysely<Database>, returnDocId: number, returnType: 'sale' | 'purchase', auth: AuthContext): Promise<string> {
    const settingRow = await trx
      .selectFrom('settings')
      .select(['value'])
      .where('key', '=', 'invoiceNumberingScheme')
      .where(this.tenantPredicate(auth))
      .executeTakeFirst();

    let scheme = 'daily';
    if (settingRow?.value) {
      try {
        scheme = JSON.parse(settingRow.value);
      } catch {
        scheme = String(settingRow.value);
      }
    }

    const prefix = returnType === 'purchase' ? 'ZPR' : 'ZR';

    if (scheme === 'sequential') {
      return `${prefix}-${returnDocId}`;
    }

    // Daily date-based numbering: ZR-YYMMDD-0001 or ZPR-YYMMDD-0001
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const lastDoc = await trx
      .selectFrom('return_documents')
      .select(sql<number>`COALESCE(MAX(CASE WHEN doc_no ~ '^[A-Za-z0-9]+-[0-9]+-[0-9]+$' THEN CAST(SPLIT_PART(doc_no, '-', 3) AS INTEGER) ELSE 0 END), 0)`.as('last_seq'))
      .where(this.tenantPredicate(auth))
      .where('return_type', '=', returnType)
      .where('created_at', '>=', startOfDay)
      .executeTakeFirst();

    const nextSeq = Number(lastDoc?.last_seq || 0) + 1;
    const seq = String(nextSeq).padStart(4, '0');
    return `${prefix}-${datePrefix}-${seq}`;
  }

  private async insertReturnDocument(trx: Kysely<Database>, row: ReturnDocumentInput, auth: AuthContext): Promise<{ id: number; docNo: string }> {
    const scope = this.scope(auth);
    const insert = await trx.insertInto('return_documents').values({
      doc_no: 'TMP',
      return_type: row.returnType,
      invoice_id: row.invoiceId,
      settlement_mode: row.settlementMode,
      refund_method: row.refundMethod,
      total: row.total,
      note: row.note,
      branch_id: row.branchId,
      location_id: row.locationId,
      created_by: auth.userId,
      ...this.tenantFields(auth),
    }).returning('id').executeTakeFirstOrThrow();

    const id = Number(insert.id);
    const docNo = await this.generateReturnDocNo(trx, id, row.returnType, auth);
    await trx.updateTable('return_documents').set({ doc_no: docNo }).where('id', '=', id).where(this.tenantPredicate(auth)).execute();
    return { id, docNo };
  }

  private async insertReturnItem(trx: Kysely<Database>, row: { returnDocumentId: number; productId: number | null; productName: string; qty: number; unitTotal: number; lineTotal: number; saleItemId?: number; purchaseItemId?: number }, auth: AuthContext): Promise<void> {
    await trx.insertInto('return_items').values({ return_document_id: row.returnDocumentId, product_id: row.productId, product_name: row.productName, qty: row.qty, unit_total: row.unitTotal, line_total: row.lineTotal, sale_item_id: row.saleItemId, purchase_item_id: row.purchaseItemId, ...this.tenantFields(auth) }).execute();
  }

  private async getReturnedQty(trx: Kysely<Database>, returnType: 'sale' | 'purchase', invoiceId: number, productId: number, auth: AuthContext, lineItemId?: number): Promise<number> {
    let query = trx.selectFrom('return_items as ri').innerJoin('return_documents as rd', 'rd.id', 'ri.return_document_id').select((eb) => eb.fn.coalesce(eb.fn.sum<number>('ri.qty'), sql<number>`0`).as('total_qty')).where('rd.return_type', '=', returnType).where('rd.invoice_id', '=', invoiceId).where(this.tenantPredicate(auth, 'rd')).where(this.tenantPredicate(auth, 'ri'));
    
    if (lineItemId) {
      query = returnType === 'sale' 
        ? query.where((eb) => eb.or([eb('ri.sale_item_id', '=', lineItemId), eb('ri.sale_item_id', 'is', null).and('ri.product_id', '=', productId)]))
        : query.where((eb) => eb.or([eb('ri.purchase_item_id', '=', lineItemId), eb('ri.purchase_item_id', 'is', null).and('ri.product_id', '=', productId)]));
    } else {
      query = query.where('ri.product_id', '=', productId);
    }
    
    const result = await query.executeTakeFirst();
    return Number(result?.total_qty || 0);
  }

  async listReturns(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db.selectFrom('return_items as ri')
      .innerJoin('return_documents as rd', 'rd.id', 'ri.return_document_id')
      .leftJoin('users as u', 'u.id', 'rd.created_by')
      .leftJoin('sales as s', (join) => join.on('rd.return_type', '=', 'sale').onRef('s.id', '=', 'rd.invoice_id'))
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .leftJoin('purchases as p', (join) => join.on('rd.return_type', '=', 'purchase').onRef('p.id', '=', 'rd.invoice_id'))
      .leftJoin('suppliers as sup', 'sup.id', 'p.supplier_id')
      .select([
        'ri.id',
        'rd.id as return_document_id',
        'rd.doc_no',
        'rd.return_type',
        'rd.invoice_id',
        'ri.product_id',
        'ri.product_name',
        'ri.qty',
        'ri.line_total',
        'rd.note',
        'rd.settlement_mode',
        'rd.refund_method',
        'rd.created_at',
        'rd.created_by',
        'u.username as created_by_name',
        sql<string>`coalesce(s.doc_no, p.doc_no, '')`.as('invoice_doc_no'),
        sql<string>`coalesce(c.name, sup.name, case when rd.return_type = 'sale' then 'عميل نقدي' else 'مورد' end)`.as('party_name'),
        sql<string>`coalesce(s.order_type, '')`.as('order_type'),
      ])
      .where(this.tenantPredicate(auth, 'rd'))
      .where(this.tenantPredicate(auth, 'ri'))
      .orderBy('rd.id', 'desc')
      .orderBy('ri.id', 'asc')
      .execute();
    const today = new Date().toISOString().slice(0, 10);
    const mapped = filterReturnRows(mapReturnRows(rows as Array<Record<string, unknown>>), query, today);
    const paged = paginateRows(mapped, query, { defaultSize: 20 });
    return { returns: paged.rows, pagination: paged.pagination, summary: summarizeReturnRows(mapped, today), scope: this.scope(auth) };
  }

  private async getManagerPin(trx: Kysely<Database>, auth: AuthContext): Promise<string> {
    const { tenantId } = requireTenantScope(auth);
    const result = await sql<{ key?: string; value?: string }>`
      select key, value from settings
      where key in ('managerPin', 'managerApprovalPin', 'manager_pin')
        and tenant_id = ${tenantId}
    `.execute(trx);

    const value = result.rows?.find((row) => String(row.key || '').length > 0)?.value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
      } catch {
        return value.trim();
      }
    }
    return '';
  }

  private async verifyManagerAuthorization(trx: Kysely<Database>, secret: string, auth: AuthContext): Promise<string> {
    const { tenantId } = requireTenantScope(auth);
    const normalizedSecret = String(secret || '').trim();
    if (!normalizedSecret) {
      throw new AppError('أدخل رمز المشرف أو كلمة المرور لاعتماد المرتجع', 'MANAGER_AUTH_REQUIRED', 403);
    }

    const managerPin = await this.getManagerPin(trx, auth);
    if (managerPin && normalizedSecret === managerPin) {
      return 'رمز المشرف';
    }

    const managerUsers = await trx
      .selectFrom('users')
      .select(['id', 'username', 'role', 'password_hash', 'password_salt'])
      .where('is_active', '=', true)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where((eb) => eb.or([eb('role', '=', 'admin'), eb('role', '=', 'super_admin')]))
      .execute();

    for (const managerUser of managerUsers) {
      const passwordCheck = await verifyPassword(
        normalizedSecret,
        String(managerUser.password_hash || ''),
        String(managerUser.password_salt || ''),
      );
      if (passwordCheck.valid) {
        return String(managerUser.username || 'المدير');
      }
    }

    throw new AppError('رمز المشرف أو كلمة المرور غير صحيحة', 'MANAGER_AUTH_INVALID', 403);
  }

  async createReturn(payload: CreateReturnDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.scope(auth);
    const idemCtx = idempotencyStorage.getStore();

    // Verify manager permission if cashier doesn't have direct return privileges
    const isPrivileged = auth.role === 'super_admin' || auth.role === 'admin' || (auth.permissions && auth.permissions.includes('canDirectReturn'));
    let approvedByName: string | undefined;

    if (!isPrivileged) {
      approvedByName = await this.verifyManagerAuthorization(this.db, payload.managerPin || '', auth);
    }

    const returnIds = await this.tx.runInTransaction(this.db, async (trx) => {
      const normalizedItems = normalizeReturnItems(payload);
      if (payload.type === 'sale') return this.createSaleReturn(trx, payload, normalizedItems, auth);
      return this.createPurchaseReturn(trx, payload, normalizedItems, auth);
    });

    const label = payload.type === 'purchase' ? 'purchase return' : 'sale return';
    const auditText = approvedByName
      ? `Created ${label} by ${auth.username} (Approved by: ${approvedByName})`
      : `Created ${label} by ${auth.username}`;
    await this.audit.log('إنشاء مرتجع', auditText, auth);

    const result = { ok: true, createdIds: returnIds, id: returnIds[0], returnDocumentId: returnIds[0] };

    // Idempotency: commit the response so future duplicate requests return it
    if (idemCtx && idemCtx.idempotencyKey && idemCtx.operationType) {
      await this.idempotency.commitOperation(
        this.db,
        { tenantId: scope.tenantId, accountId: scope.accountId, idempotencyKey: idemCtx.idempotencyKey, operationType: idemCtx.operationType },
        result
      );
    }

    return result;
  }

  private async createSaleReturn(trx: Kysely<Database>, payload: CreateReturnDto, items: ReturnInputItem[], auth: AuthContext): Promise<number[]> {
    const scope = this.scope(auth);
    const sale = await trx.selectFrom('sales').selectAll().where('id', '=', Number(payload.invoiceId)).where('status', '=', 'posted').where(this.tenantPredicate(auth)).forUpdate().executeTakeFirst();
    if (!sale) throw new AppError('Invoice not found', 'INVOICE_NOT_FOUND', 404);
    const saleItems = await trx.selectFrom('sale_items').selectAll().where('sale_id', '=', Number(payload.invoiceId)).where(this.tenantPredicate(auth)).execute();
    const settlementMode = payload.settlementMode === 'store_credit' ? 'store_credit' : 'refund';
    const refundMethod = payload.refundMethod === 'card' ? 'card' : 'cash';
    const normalizedLines: Array<{ productId: number; productName: string; qty: number; unitTotal: number; lineTotal: number; saleItemId?: number; purchaseItemId?: number }> = [];

    const inMemoryReturnedQtyForProduct = new Map<string, number>();

    const returnedRows = await trx
      .selectFrom('return_items as ri')
      .innerJoin('return_documents as rd', 'rd.id', 'ri.return_document_id')
      .select([
        'ri.product_id',
        'ri.sale_item_id',
        (eb) => eb.fn.coalesce(eb.fn.sum<number>('ri.qty'), sql<number>`0`).as('total_qty')
      ])
      .where('rd.return_type', '=', 'sale')
      .where('rd.invoice_id', '=', Number(payload.invoiceId))
      .where(this.tenantPredicate(auth, 'rd'))
      .where(this.tenantPredicate(auth, 'ri'))
      .groupBy(['ri.product_id', 'ri.sale_item_id'])
      .execute();

    const returnedQtyByLine = new Map<number, number>();
    const returnedQtyByProduct = new Map<number, number>();
    for (const r of returnedRows) {
      const q = Number(r.total_qty || 0);
      if (r.sale_item_id) {
        returnedQtyByLine.set(Number(r.sale_item_id), q);
      }
      const pId = Number(r.product_id || 0);
      returnedQtyByProduct.set(pId, (returnedQtyByProduct.get(pId) || 0) + q);
    }

    for (const requestItem of items) {
      // If saleItemId is provided, validate it belongs to this invoice AND this product
      if (requestItem.saleItemId) {
        const matchedItem = saleItems.find(
          (entry) => Number(entry.id) === requestItem.saleItemId && Number(entry.product_id) === requestItem.productId
        );
        if (!matchedItem) {
          throw new AppError(
            `saleItemId ${requestItem.saleItemId} does not belong to invoice ${payload.invoiceId} or product ${requestItem.productId}`,
            'INVALID_SALE_ITEM_ID',
            400
          );
        }
      }

      const saleItem = requestItem.saleItemId
        ? saleItems.find((entry) => Number(entry.id) === requestItem.saleItemId)
        : saleItems.find((entry) => Number(entry.product_id || 0) === Number(requestItem.productId));
      if (!saleItem) throw new AppError('Return item not found', 'NOT_FOUND', 404);
      
      const alreadyReturnedQty = requestItem.saleItemId
        ? (returnedQtyByLine.get(requestItem.saleItemId) || 0)
        : (returnedQtyByProduct.get(requestItem.productId) || 0);
      const limitKey = requestItem.saleItemId ? `line_${requestItem.saleItemId}` : `prod_${requestItem.productId}`;
      const currentInMemory = inMemoryReturnedQtyForProduct.get(limitKey) || 0;
      
      let invoiceMaxLimit = 0;
      if (requestItem.saleItemId) {
        invoiceMaxLimit = Number(saleItem.qty || 0);
      } else {
        invoiceMaxLimit = saleItems
          .filter((entry) => Number(entry.product_id) === requestItem.productId)
          .reduce((sum, entry) => sum + Number(entry.qty || 0), 0);
      }
        
      ensureReturnQtyWithinLimit(requestItem.qty + currentInMemory, alreadyReturnedQty, invoiceMaxLimit);
      inMemoryReturnedQtyForProduct.set(limitKey, currentInMemory + requestItem.qty);

      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', requestItem.productId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const preparedLine = buildSaleReturnLine(saleItem, product, requestItem);

      const allocations = requestItem.saleItemId ? await trx.selectFrom('sale_line_stock_allocations')
         .selectAll()
         .where('sale_line_id', '=', requestItem.saleItemId)
         .where(this.tenantPredicate(auth))
         .orderBy('allocation_order', 'desc')
         .execute() : [];

      if (allocations.length > 0) {
         let remainingToSkip = Number((alreadyReturnedQty * Number(saleItem.unit_multiplier || 1)).toFixed(3));
         let remainingToReturn = preparedLine.stockDelta;

         for (const alloc of allocations) {
            if (remainingToReturn <= 0) break;
            const allocQty = Number(alloc.quantity || 0);
            
            let availableInAlloc = allocQty;
            if (remainingToSkip > 0) {
               const skipFromThis = Math.min(availableInAlloc, remainingToSkip);
               remainingToSkip -= skipFromThis;
               availableInAlloc -= skipFromThis;
            }

            if (availableInAlloc > 0) {
               const returnToThis = Math.min(availableInAlloc, remainingToReturn);
               remainingToReturn = Number((remainingToReturn - returnToThis).toFixed(3));

                const locData = await trx
                  .selectFrom('stock_locations')
                  .select('branch_id')
                  .where('id', '=', alloc.location_id)
                  .where(this.tenantPredicate(auth))
                  .executeTakeFirst();
                const branchId = locData?.branch_id || sale.branch_id;

               const stockChange = await applyStockDelta(trx, { productId: requestItem.productId, delta: returnToThis, branchId: branchId, locationId: alloc.location_id, tenantId: scope.tenantId, accountId: scope.accountId, allowNegative: true });
               await trx.insertInto('stock_movements').values({ product_id: requestItem.productId, movement_type: 'sale_return', qty: returnToThis, before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, reason: 'sale_return', note: 'sale return S-' + String(sale.id), reference_type: 'sale_return', reference_id: Number(payload.invoiceId), branch_id: branchId, location_id: alloc.location_id, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
            }
         }
         
         // Fallback if allocations are not enough (e.g. data anomaly)
         if (remainingToReturn > 0) {
            const stockChange = await applyStockDelta(trx, { productId: requestItem.productId, delta: remainingToReturn, branchId: sale.branch_id, locationId: sale.location_id, tenantId: scope.tenantId, accountId: scope.accountId, allowNegative: true });
            await trx.insertInto('stock_movements').values({ product_id: requestItem.productId, movement_type: 'sale_return', qty: remainingToReturn, before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, reason: 'sale_return', note: 'sale return fallback S-' + String(sale.id), reference_type: 'sale_return', reference_id: Number(payload.invoiceId), branch_id: sale.branch_id, location_id: sale.location_id, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
         }
      } else {
         const stockChange = await applyStockDelta(trx, { productId: requestItem.productId, delta: preparedLine.stockDelta, branchId: sale.branch_id, locationId: sale.location_id, tenantId: scope.tenantId, accountId: scope.accountId, allowNegative: true });
         await trx.insertInto('stock_movements').values({ product_id: requestItem.productId, movement_type: 'sale_return', qty: preparedLine.stockDelta, before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, reason: 'sale_return', note: 'sale return S-' + String(sale.id), reference_type: 'sale_return', reference_id: Number(payload.invoiceId), branch_id: sale.branch_id, location_id: sale.location_id, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
      }

      normalizedLines.push({ productId: preparedLine.productId, productName: preparedLine.productName, qty: preparedLine.qty, unitTotal: preparedLine.unitTotal, lineTotal: preparedLine.lineTotal, saleItemId: requestItem.saleItemId });
    }

    const total = calculateReturnDocumentTotal(normalizedLines);
    // TODO(accounting): Sale returns here can be partial line-level returns.
    // Do not post full-sale reversal journals for this flow.
    // Implement dedicated partial return accounting entries when reliable line-level accounting mapping is finalized.
    const { id: returnDocumentId, docNo: returnDocNo } = await this.insertReturnDocument(trx, { returnType: 'sale', invoiceId: Number(payload.invoiceId), settlementMode, refundMethod, total, note: String(payload.note || '').trim(), branchId: sale.branch_id, locationId: sale.location_id }, auth);
    for (const line of normalizedLines) await this.insertReturnItem(trx, { returnDocumentId, productId: line.productId, productName: line.productName, qty: line.qty, unitTotal: line.unitTotal, lineTotal: line.lineTotal, saleItemId: line.saleItemId }, auth);
    const customerId = sale.customer_id ? Number(sale.customer_id) : null;
    if (settlementMode === 'store_credit' && customerId) await this.addStoreCredit(trx, customerId, total, auth);
    else if (sale.payment_type === 'credit' && customerId) await this.addCustomerLedgerEntry(trx, customerId, -total, 'sale_return', 'sale return ' + returnDocNo, returnDocumentId, auth, sale.branch_id, sale.location_id);
    else if (refundMethod === 'cash') await this.addTreasuryTransaction(trx, 'sale_return_refund', -total, 'sale return ' + returnDocNo, returnDocumentId, auth, sale.branch_id, sale.location_id);
    else if (refundMethod === 'card') await this.addTreasuryTransaction(trx, 'sale_return_refund', -total, 'sale return (card) ' + returnDocNo, returnDocumentId, auth, sale.branch_id, sale.location_id);

    try {
      await this.accountingPosting.postSalesReturn(trx, returnDocumentId, auth);
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to post accounting journal for sales return',
        'SALES_RETURN_ACCOUNTING_POST_FAILED',
        500,
      );
    }
    return [returnDocumentId];
  }

  private async createPurchaseReturn(trx: Kysely<Database>, payload: CreateReturnDto, items: ReturnInputItem[], auth: AuthContext): Promise<number[]> {
    const scope = this.scope(auth);
    const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', Number(payload.invoiceId)).where('status', '=', 'posted').where(this.tenantPredicate(auth)).forUpdate().executeTakeFirst();
    if (!purchase) throw new AppError('Invoice not found', 'INVOICE_NOT_FOUND', 404);
    const purchaseItems = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', Number(payload.invoiceId)).where(this.tenantPredicate(auth)).execute();
    const normalizedLines: Array<{ productId: number; productName: string; qty: number; unitTotal: number; lineTotal: number; saleItemId?: number; purchaseItemId?: number }> = [];

    const inMemoryReturnedQtyForProduct = new Map<string, number>();

    const returnedRows = await trx
      .selectFrom('return_items as ri')
      .innerJoin('return_documents as rd', 'rd.id', 'ri.return_document_id')
      .select([
        'ri.product_id',
        'ri.purchase_item_id',
        (eb) => eb.fn.coalesce(eb.fn.sum<number>('ri.qty'), sql<number>`0`).as('total_qty')
      ])
      .where('rd.return_type', '=', 'purchase')
      .where('rd.invoice_id', '=', Number(payload.invoiceId))
      .where(this.tenantPredicate(auth, 'rd'))
      .where(this.tenantPredicate(auth, 'ri'))
      .groupBy(['ri.product_id', 'ri.purchase_item_id'])
      .execute();

    const returnedQtyByLine = new Map<number, number>();
    const returnedQtyByProduct = new Map<number, number>();
    for (const r of returnedRows) {
      const q = Number(r.total_qty || 0);
      if (r.purchase_item_id) {
        returnedQtyByLine.set(Number(r.purchase_item_id), q);
      }
      const pId = Number(r.product_id || 0);
      returnedQtyByProduct.set(pId, (returnedQtyByProduct.get(pId) || 0) + q);
    }

    for (const requestItem of items) {
      const purchaseItem = requestItem.purchaseItemId
        ? purchaseItems.find((entry) => Number(entry.id) === requestItem.purchaseItemId)
        : purchaseItems.find((entry) => Number(entry.product_id || 0) === Number(requestItem.productId));
      if (!purchaseItem) throw new AppError('Return item not found', 'NOT_FOUND', 404);
      
      const alreadyReturnedQty = requestItem.purchaseItemId
        ? (returnedQtyByLine.get(requestItem.purchaseItemId) || 0)
        : (returnedQtyByProduct.get(requestItem.productId) || 0);
      const limitKey = requestItem.purchaseItemId ? `line_${requestItem.purchaseItemId}` : `prod_${requestItem.productId}`;
      const currentInMemory = inMemoryReturnedQtyForProduct.get(limitKey) || 0;
      
      let invoiceMaxLimit = 0;
      if (requestItem.purchaseItemId) {
        invoiceMaxLimit = Number(purchaseItem.qty || 0);
      } else {
        invoiceMaxLimit = purchaseItems
          .filter((entry) => Number(entry.product_id) === requestItem.productId)
          .reduce((sum, entry) => sum + Number(entry.qty || 0), 0);
      }
        
      ensureReturnQtyWithinLimit(requestItem.qty + currentInMemory, alreadyReturnedQty, invoiceMaxLimit);
      inMemoryReturnedQtyForProduct.set(limitKey, currentInMemory + requestItem.qty);

      const availableQty = await previewConsumableStockQty(trx, { productId: requestItem.productId, branchId: purchase.branch_id, locationId: purchase.location_id, tenantId: scope.tenantId, accountId: scope.accountId });
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', requestItem.productId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const preparedLine = buildPurchaseReturnLine(purchaseItem, { ...product, stock_qty: availableQty }, requestItem);
      const stockChange = await applyStockDelta(trx, { productId: requestItem.productId, delta: -preparedLine.stockDelta, branchId: purchase.branch_id, locationId: purchase.location_id, tenantId: scope.tenantId, accountId: scope.accountId, errorCode: 'PURCHASE_RETURN_STOCK_INVALID', errorMessage: 'Invalid stock for purchase return' });
      await trx.insertInto('stock_movements').values({ product_id: requestItem.productId, movement_type: 'purchase_return', qty: -preparedLine.stockDelta, before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, reason: 'purchase_return', note: 'purchase return PUR-' + String(purchase.id), reference_type: 'purchase_return', reference_id: Number(payload.invoiceId), branch_id: purchase.branch_id, location_id: purchase.location_id, created_by: auth.userId, ...this.tenantFields(auth) }).execute();
      normalizedLines.push({ productId: preparedLine.productId, productName: preparedLine.productName, qty: preparedLine.qty, unitTotal: preparedLine.unitTotal, lineTotal: preparedLine.lineTotal, purchaseItemId: requestItem.purchaseItemId });
    }

    const total = calculateReturnDocumentTotal(normalizedLines);
    const refundMethod = payload.refundMethod === 'card' ? 'card' : 'cash';
    const { id: returnDocumentId, docNo: returnDocNo } = await this.insertReturnDocument(trx, { returnType: 'purchase', invoiceId: Number(payload.invoiceId), settlementMode: 'refund', refundMethod, total, note: String(payload.note || '').trim(), branchId: purchase.branch_id, locationId: purchase.location_id }, auth);
    for (const line of normalizedLines) await this.insertReturnItem(trx, { returnDocumentId, productId: line.productId, productName: line.productName, qty: line.qty, unitTotal: line.unitTotal, lineTotal: line.lineTotal, purchaseItemId: line.purchaseItemId }, auth);
    if (purchase.payment_type === 'credit' && purchase.supplier_id) await this.addSupplierLedgerEntry(trx, Number(purchase.supplier_id), -total, 'purchase_return', 'purchase return ' + returnDocNo, returnDocumentId, auth, purchase.branch_id, purchase.location_id);
    else await this.addTreasuryTransaction(trx, 'purchase_return_refund', total, 'purchase return ' + returnDocNo, returnDocumentId, auth, purchase.branch_id, purchase.location_id);
    return [returnDocumentId];
  }
}
