import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../common/errors/app-error';
import { paginateRows } from '../../common/utils/pagination';
import { ensureNonNegativeStock, ensureReturnQtyWithinLimit } from '../../common/utils/financial-integrity';
import { normalizeReturnItems } from './helpers/return-payload.helper';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import { CreateReturnDto } from './dto/create-return.dto';

type ReturnInputItem = { productId: number; productName: string; qty: number };

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private async addTreasuryTransaction(
    trx: Kysely<Database>,
    txnType: string,
    amount: number,
    note: string,
    referenceId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    await trx.insertInto('treasury_transactions').values({
      txn_type: txnType,
      amount,
      note,
      reference_type: 'return',
      reference_id: referenceId,
      branch_id: branchId,
      location_id: locationId,
      created_by: auth.userId,
    }).execute();
  }

  private async addCustomerLedgerEntry(
    trx: Kysely<Database>,
    customerId: number,
    amount: number,
    entryType: string,
    note: string,
    referenceId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const customer = await trx.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const balanceAfter = Number((Number(customer.balance || 0) + amount).toFixed(2));
    await trx.insertInto('customer_ledger').values({
      customer_id: customerId, entry_type: entryType, amount, balance_after: balanceAfter, note,
      reference_type: 'return', reference_id: referenceId, branch_id: branchId, location_id: locationId, created_by: auth.userId,
    }).execute();
    await trx.updateTable('customers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async addSupplierLedgerEntry(
    trx: Kysely<Database>,
    supplierId: number,
    amount: number,
    entryType: string,
    note: string,
    referenceId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const supplier = await trx.selectFrom('suppliers').select(['balance']).where('id', '=', supplierId).executeTakeFirstOrThrow();
    const balanceAfter = Number((Number(supplier.balance || 0) + amount).toFixed(2));
    await trx.insertInto('supplier_ledger').values({
      supplier_id: supplierId, entry_type: entryType, amount, balance_after: balanceAfter, note,
      reference_type: 'return', reference_id: referenceId, branch_id: branchId, location_id: locationId, created_by: auth.userId,
    }).execute();
    await trx.updateTable('suppliers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', supplierId).execute();
  }

  private async addStoreCredit(trx: Kysely<Database>, customerId: number, amount: number): Promise<void> {
    const customer = await trx.selectFrom('customers').select(['store_credit_balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const nextBalance = Number((Number(customer.store_credit_balance || 0) + amount).toFixed(2));
    await trx.updateTable('customers').set({ store_credit_balance: nextBalance, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async insertReturnRow(
    trx: Kysely<Database>,
    row: { returnType: 'sale' | 'purchase'; invoiceId: number; productId: number | null; productName: string; qty: number; total: number; settlementMode: string; refundMethod: string; note: string; branchId: number | null; locationId: number | null; },
    auth: AuthContext,
  ): Promise<number> {
    const insert = await sql<{ id: number }>`
      INSERT INTO "returns"
      (return_type, invoice_id, product_id, product_name, qty, total, settlement_mode, refund_method, note, branch_id, location_id, created_by)
      VALUES
      (${row.returnType}, ${row.invoiceId}, ${row.productId}, ${row.productName}, ${row.qty}, ${row.total}, ${row.settlementMode}, ${row.refundMethod}, ${row.note}, ${row.branchId}, ${row.locationId}, ${auth.userId})
      RETURNING id
    `.execute(trx);
    const id = Number(insert.rows[0]?.id || 0);
    await sql`UPDATE "returns" SET doc_no = ${'RET-' + String(id)} WHERE id = ${id}`.execute(trx);
    return id;
  }

  async listReturns(query: Record<string, unknown>, _auth: AuthContext): Promise<Record<string, unknown>> {
    const rowsResult = await sql<{ id: number; doc_no: string | null; return_type: string; invoice_id: number | null; product_id: number | null; product_name: string; qty: string | number; total: string | number; note: string; settlement_mode: string; refund_method: string; created_at: string; }>`
      SELECT id, doc_no, return_type, invoice_id, product_id, product_name, qty, total, note, settlement_mode, refund_method, created_at
      FROM "returns"
      ORDER BY id DESC
    `.execute(this.db);
    let rows = rowsResult.rows.map((row) => ({
      id: String(row.id), docNo: row.doc_no || ('RET-' + String(row.id)), returnType: row.return_type || 'sale', type: row.return_type || 'sale',
      invoiceId: row.invoice_id ? String(row.invoice_id) : '', productId: row.product_id ? String(row.product_id) : '', productName: row.product_name || '',
      qty: Number(row.qty || 0), total: Number(row.total || 0), note: row.note || '', settlementMode: row.settlement_mode || 'refund', refundMethod: row.refund_method || '', createdAt: row.created_at, date: row.created_at,
    }));
    const q = String(query.search || query.q || '').trim().toLowerCase();
    const filter = String(query.filter || query.view || 'all').trim();
    const today = new Date().toISOString().slice(0, 10);
    rows = rows.filter((row) => {
      if (filter === 'sales' && row.returnType !== 'sale') return false;
      if (filter === 'purchase' && row.returnType !== 'purchase') return false;
      if (filter === 'today' && String(row.createdAt || '').slice(0, 10) !== today) return false;
      if (!q) return true;
      return [row.docNo, row.productName, row.note, row.returnType].some((value) => String(value || '').toLowerCase().includes(q));
    });
    const paged = paginateRows(rows, query, { defaultSize: 20 });
    return {
      returns: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        salesReturns: rows.filter((row) => row.returnType === 'sale').length,
        purchaseReturns: rows.filter((row) => row.returnType === 'purchase').length,
        todayCount: rows.filter((row) => String(row.createdAt || '').slice(0, 10) === today).length,
        latestDocNo: rows[0]?.docNo || '',
      },
    };
  }

  async createReturn(payload: CreateReturnDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const returnIds = await this.tx.runInTransaction(this.db, async (trx) => {
      const normalizedItems = normalizeReturnItems(payload);
      if (payload.type === 'sale') return this.createSaleReturn(trx, payload, normalizedItems, auth);
      return this.createPurchaseReturn(trx, payload, normalizedItems, auth);
    });
    const label = payload.type === 'purchase' ? 'مرتجع شراء' : 'مرتجع بيع';
    await this.audit.log('إنشاء مرتجع', 'تم إنشاء ' + label + ' بواسطة ' + auth.username, auth.userId);
    return { ok: true, createdIds: returnIds, ...(await this.listReturns({}, auth)) };
  }

  private async createSaleReturn(trx: Kysely<Database>, payload: CreateReturnDto, items: ReturnInputItem[], auth: AuthContext): Promise<number[]> {
    const sale = await trx.selectFrom('sales').selectAll().where('id', '=', Number(payload.invoiceId)).where('status', '=', 'posted').executeTakeFirst();
    if (!sale) throw new AppError('Invoice not found', 'INVOICE_NOT_FOUND', 404);
    const saleItems = await trx.selectFrom('sale_items').selectAll().where('sale_id', '=', Number(payload.invoiceId)).execute();
    const createdIds: number[] = [];
    const settlementMode = payload.settlementMode === 'store_credit' ? 'store_credit' : 'refund';
    const refundMethod = payload.refundMethod === 'card' ? 'card' : 'cash';
    for (const requestItem of items) {
      const saleItem = saleItems.find((entry) => Number(entry.product_id || 0) === Number(requestItem.productId));
      if (!saleItem) throw new AppError('العنصر المطلوب غير موجود.', 'NOT_FOUND', 404);
      const returnedQtyResult = await sql<{ total_qty: string | number }>`
        SELECT COALESCE(SUM(qty), 0) AS total_qty FROM "returns"
        WHERE return_type = 'sale' AND invoice_id = ${Number(payload.invoiceId)} AND product_id = ${requestItem.productId}
      `.execute(trx);
      const alreadyReturnedQty = Number(returnedQtyResult.rows[0]?.total_qty || 0);
      const soldQty = Number(saleItem.qty || 0);
      ensureReturnQtyWithinLimit(requestItem.qty, alreadyReturnedQty, soldQty);
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', requestItem.productId).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const lineUnitTotal = soldQty > 0 ? Number(saleItem.line_total || 0) / soldQty : 0;
      const returnTotal = Number((requestItem.qty * lineUnitTotal).toFixed(2));
      const stockDelta = Number((requestItem.qty * Number(saleItem.unit_multiplier || 1)).toFixed(3));
      const beforeQty = Number(product.stock_qty || 0);
      const afterQty = Number((beforeQty + stockDelta).toFixed(3));
      await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', requestItem.productId).execute();
      await trx.insertInto('stock_movements').values({
        product_id: requestItem.productId, movement_type: 'sale_return', qty: stockDelta, before_qty: beforeQty, after_qty: afterQty, reason: 'sale_return',
        note: 'مرتجع بيع على الفاتورة S-' + String(sale.id), reference_type: 'sale_return', reference_id: Number(payload.invoiceId), branch_id: sale.branch_id, location_id: sale.location_id, created_by: auth.userId,
      }).execute();
      const returnId = await this.insertReturnRow(trx, {
        returnType: 'sale', invoiceId: Number(payload.invoiceId), productId: requestItem.productId, productName: saleItem.product_name || requestItem.productName || '',
        qty: requestItem.qty, total: returnTotal, settlementMode, refundMethod, note: String(payload.note || '').trim(), branchId: sale.branch_id, locationId: sale.location_id,
      }, auth);
      const customerId = sale.customer_id ? Number(sale.customer_id) : null;
      if (settlementMode === 'store_credit' && customerId) {
        await this.addStoreCredit(trx, customerId, returnTotal);
      } else if (sale.payment_type === 'credit' && customerId) {
        await this.addCustomerLedgerEntry(trx, customerId, -returnTotal, 'sale_return', 'مرتجع بيع RET-' + String(returnId), returnId, auth, sale.branch_id, sale.location_id);
      } else if (refundMethod === 'cash') {
        await this.addTreasuryTransaction(trx, 'sale_return_refund', -returnTotal, 'صرف مرتجع بيع RET-' + String(returnId), returnId, auth, sale.branch_id, sale.location_id);
      }
      createdIds.push(returnId);
    }
    return createdIds;
  }

  private async createPurchaseReturn(trx: Kysely<Database>, payload: CreateReturnDto, items: ReturnInputItem[], auth: AuthContext): Promise<number[]> {
    const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', Number(payload.invoiceId)).where('status', '=', 'posted').executeTakeFirst();
    if (!purchase) throw new AppError('Invoice not found', 'INVOICE_NOT_FOUND', 404);
    const purchaseItems = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', Number(payload.invoiceId)).execute();
    const createdIds: number[] = [];
    for (const requestItem of items) {
      const purchaseItem = purchaseItems.find((entry) => Number(entry.product_id || 0) === Number(requestItem.productId));
      if (!purchaseItem) throw new AppError('العنصر المطلوب غير موجود.', 'NOT_FOUND', 404);
      const returnedQtyResult = await sql<{ total_qty: string | number }>`
        SELECT COALESCE(SUM(qty), 0) AS total_qty FROM "returns"
        WHERE return_type = 'purchase' AND invoice_id = ${Number(payload.invoiceId)} AND product_id = ${requestItem.productId}
      `.execute(trx);
      const alreadyReturnedQty = Number(returnedQtyResult.rows[0]?.total_qty || 0);
      const purchasedQty = Number(purchaseItem.qty || 0);
      ensureReturnQtyWithinLimit(requestItem.qty, alreadyReturnedQty, purchasedQty);
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', requestItem.productId).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const stockDelta = Number((requestItem.qty * Number(purchaseItem.unit_multiplier || 1)).toFixed(3));
      const beforeQty = Number(product.stock_qty || 0);
      if (beforeQty + 0.0001 < stockDelta) throw new AppError('المخزون الحالي لا يسمح بتنفيذ مرتجع الشراء لهذا الصنف', 'PURCHASE_RETURN_STOCK_INVALID', 400);
      const afterQty = Number((beforeQty - stockDelta).toFixed(3));
      const lineUnitTotal = purchasedQty > 0 ? Number(purchaseItem.line_total || 0) / purchasedQty : 0;
      const returnTotal = Number((requestItem.qty * lineUnitTotal).toFixed(2));
      await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', requestItem.productId).execute();
      await trx.insertInto('stock_movements').values({
        product_id: requestItem.productId, movement_type: 'purchase_return', qty: -stockDelta, before_qty: beforeQty, after_qty: afterQty, reason: 'purchase_return',
        note: 'مرتجع شراء على الفاتورة PUR-' + String(purchase.id), reference_type: 'purchase_return', reference_id: Number(payload.invoiceId), branch_id: purchase.branch_id, location_id: purchase.location_id, created_by: auth.userId,
      }).execute();
      const returnId = await this.insertReturnRow(trx, {
        returnType: 'purchase', invoiceId: Number(payload.invoiceId), productId: requestItem.productId, productName: purchaseItem.product_name || requestItem.productName || '',
        qty: requestItem.qty, total: returnTotal, settlementMode: 'refund', refundMethod: payload.refundMethod === 'card' ? 'card' : 'cash', note: String(payload.note || '').trim(), branchId: purchase.branch_id, locationId: purchase.location_id,
      }, auth);
      if (purchase.payment_type === 'credit' && purchase.supplier_id) {
        await this.addSupplierLedgerEntry(trx, Number(purchase.supplier_id), -returnTotal, 'purchase_return', 'مرتجع شراء RET-' + String(returnId), returnId, auth, purchase.branch_id, purchase.location_id);
      } else {
        await this.addTreasuryTransaction(trx, 'purchase_return_refund', returnTotal, 'تحصيل مرتجع شراء RET-' + String(returnId), returnId, auth, purchase.branch_id, purchase.location_id);
      }
      createdIds.push(returnId);
    }
    return createdIds;
  }
}