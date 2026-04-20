import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
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

type ReturnInputItem = { productId: number; productName: string; qty: number };

type ReturnDocumentInput = {
  returnType: 'sale' | 'purchase';
  invoiceId: number;
  settlementMode: string;
  refundMethod: string;
  total: number;
  note: string;
  branchId: number | null;
  locationId: number | null;
};

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private async findOwnOpenShift(trx: Kysely<Database>, auth: AuthContext): Promise<{ id: number; docNo: string } | null> {
    const shift = await trx
      .selectFrom('cashier_shifts')
      .select(['id'])
      .where('opened_by', '=', auth.userId)
      .where('status', '=', 'open')
      .orderBy('id desc')
      .executeTakeFirst();

    if (!shift?.id) return null;
    return {
      id: Number(shift.id),
      docNo: `SHIFT-${shift.id}` ,
    };
  }

  private async addTreasuryTransaction(
    trx: Kysely<Database>,
    txnType: string,
    amount: number,
    note: string,
    returnDocumentId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const currentShift = amount < 0 ? await this.findOwnOpenShift(trx, auth) : null;
    await trx.insertInto('treasury_transactions').values({
      txn_type: txnType,
      amount,
      note: currentShift ? `${note} · على ${currentShift.docNo}` : note,
      reference_type: currentShift ? 'cashier_shift' : 'return_document',
      reference_id: currentShift ? currentShift.id : returnDocumentId,
      return_document_id: returnDocumentId,
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
    returnDocumentId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const customer = await trx.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const balanceAfter = calculateNextLedgerBalance(customer.balance, amount);
    await trx.insertInto('customer_ledger').values({
      customer_id: customerId,
      entry_type: entryType,
      amount,
      balance_after: balanceAfter,
      note,
      reference_type: 'return_document',
      reference_id: returnDocumentId,
      return_document_id: returnDocumentId,
      branch_id: branchId,
      location_id: locationId,
      created_by: auth.userId,
    }).execute();
    await trx.updateTable('customers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async addSupplierLedgerEntry(
    trx: Kysely<Database>,
    supplierId: number,
    amount: number,
    entryType: string,
    note: string,
    returnDocumentId: number,
    auth: AuthContext,
    branchId: number | null,
    locationId: number | null,
  ): Promise<void> {
    const supplier = await trx.selectFrom('suppliers').select(['balance']).where('id', '=', supplierId).executeTakeFirstOrThrow();
    const balanceAfter = calculateNextLedgerBalance(supplier.balance, amount);
    await trx.insertInto('supplier_ledger').values({
      supplier_id: supplierId,
      entry_type: entryType,
      amount,
      balance_after: balanceAfter,
      note,
      reference_type: 'return_document',
      reference_id: returnDocumentId,
      return_document_id: returnDocumentId,
      branch_id: branchId,
      location_id: locationId,
      created_by: auth.userId,
    }).execute();
    await trx.updateTable('suppliers').set({ balance: balanceAfter, updated_at: sql`NOW()` }).where('id', '=', supplierId).execute();
  }

  private async addStoreCredit(trx: Kysely<Database>, customerId: number, amount: number): Promise<void> {
    const customer = await trx.selectFrom('customers').select(['store_credit_balance']).where('id', '=', customerId).executeTakeFirstOrThrow();
    const nextBalance = calculateNextLedgerBalance(customer.store_credit_balance, amount);
    await trx.updateTable('customers').set({ store_credit_balance: nextBalance, updated_at: sql`NOW()` }).where('id', '=', customerId).execute();
  }

  private async insertReturnDocument(
    trx: Kysely<Database>,
    row: ReturnDocumentInput,
    auth: AuthContext,
  ): Promise<number> {
    const insert = await sql<{ id: number }>`
      INSERT INTO return_documents
      (return_type, invoice_id, settlement_mode, refund_method, total, note, branch_id, location_id, created_by)
      VALUES
      (${row.returnType}, ${row.invoiceId}, ${row.settlementMode}, ${row.refundMethod}, ${row.total}, ${row.note}, ${row.branchId}, ${row.locationId}, ${auth.userId})
      RETURNING id
    `.execute(trx);
    const id = Number(insert.rows[0]?.id || 0);
    await sql`UPDATE return_documents SET doc_no = ${'RET-' + String(id)} WHERE id = ${id}`.execute(trx);
    return id;
  }

  private async insertReturnItem(
    trx: Kysely<Database>,
    row: { returnDocumentId: number; productId: number | null; productName: string; qty: number; unitTotal: number; lineTotal: number },
  ): Promise<void> {
    await trx.insertInto('return_items').values({
      return_document_id: row.returnDocumentId,
      product_id: row.productId,
      product_name: row.productName,
      qty: row.qty,
      unit_total: row.unitTotal,
      line_total: row.lineTotal,
    }).execute();
  }

  private async getReturnedQty(
    trx: Kysely<Database>,
    returnType: 'sale' | 'purchase',
    invoiceId: number,
    productId: number,
  ): Promise<number> {
    const result = await trx
      .selectFrom('return_items as ri')
      .innerJoin('return_documents as rd', 'rd.id', 'ri.return_document_id')
      .select((eb) => eb.fn.coalesce(eb.fn.sum<number>('ri.qty'), sql<number>`0`).as('total_qty'))
      .where('rd.return_type', '=', returnType)
      .where('rd.invoice_id', '=', invoiceId)
      .where('ri.product_id', '=', productId)
      .executeTakeFirst();
    return Number(result?.total_qty || 0);
  }

  async listReturns(query: Record<string, unknown>, _auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('return_items as ri')
      .innerJoin('return_documents as rd', 'rd.id', 'ri.return_document_id')
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
      ])
      .orderBy('rd.id desc')
      .orderBy('ri.id asc')
      .execute();

    const today = new Date().toISOString().slice(0, 10);
    const mapped = filterReturnRows(mapReturnRows(rows as Array<Record<string, unknown>>), query, today);
    const paged = paginateRows(mapped, query, { defaultSize: 20 });
    return {
      returns: paged.rows,
      pagination: paged.pagination,
      summary: summarizeReturnRows(mapped, today),
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
    const settlementMode = payload.settlementMode === 'store_credit' ? 'store_credit' : 'refund';
    const refundMethod = payload.refundMethod === 'card' ? 'card' : 'cash';

    const normalizedLines: Array<{ productId: number; productName: string; qty: number; unitTotal: number; lineTotal: number }> = [];

    for (const requestItem of items) {
      const saleItem = saleItems.find((entry) => Number(entry.product_id || 0) === Number(requestItem.productId));
      if (!saleItem) throw new AppError('العنصر المطلوب غير موجود.', 'NOT_FOUND', 404);
      const alreadyReturnedQty = await this.getReturnedQty(trx, 'sale', Number(payload.invoiceId), requestItem.productId);
      const soldQty = Number(saleItem.qty || 0);
      ensureReturnQtyWithinLimit(requestItem.qty, alreadyReturnedQty, soldQty);
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', requestItem.productId).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const preparedLine = buildSaleReturnLine(saleItem, product, requestItem);
      const stockChange = await applyStockDelta(trx, {
        productId: requestItem.productId,
        delta: preparedLine.stockDelta,
        branchId: sale.branch_id,
        locationId: sale.location_id,
      });
      await trx.insertInto('stock_movements').values({
        product_id: requestItem.productId,
        movement_type: 'sale_return',
        qty: preparedLine.stockDelta,
        before_qty: stockChange.scopeBefore,
        after_qty: stockChange.scopeAfter,
        reason: 'sale_return',
        note: 'مرتجع بيع على الفاتورة S-' + String(sale.id),
        reference_type: 'sale_return',
        reference_id: Number(payload.invoiceId),
        branch_id: sale.branch_id,
        location_id: sale.location_id,
        created_by: auth.userId,
      }).execute();
      normalizedLines.push({
        productId: preparedLine.productId,
        productName: preparedLine.productName,
        qty: preparedLine.qty,
        unitTotal: preparedLine.unitTotal,
        lineTotal: preparedLine.lineTotal,
      });
    }

    const total = calculateReturnDocumentTotal(normalizedLines);
    const returnDocumentId = await this.insertReturnDocument(trx, {
      returnType: 'sale',
      invoiceId: Number(payload.invoiceId),
      settlementMode,
      refundMethod,
      total,
      note: String(payload.note || '').trim(),
      branchId: sale.branch_id,
      locationId: sale.location_id,
    }, auth);

    for (const line of normalizedLines) {
      await this.insertReturnItem(trx, {
        returnDocumentId,
        productId: line.productId,
        productName: line.productName,
        qty: line.qty,
        unitTotal: line.unitTotal,
        lineTotal: line.lineTotal,
      });
    }

    const customerId = sale.customer_id ? Number(sale.customer_id) : null;
    if (settlementMode === 'store_credit' && customerId) {
      await this.addStoreCredit(trx, customerId, total);
    } else if (sale.payment_type === 'credit' && customerId) {
      await this.addCustomerLedgerEntry(trx, customerId, -total, 'sale_return', 'مرتجع بيع RET-' + String(returnDocumentId), returnDocumentId, auth, sale.branch_id, sale.location_id);
    } else if (refundMethod === 'cash') {
      await this.addTreasuryTransaction(trx, 'sale_return_refund', -total, 'صرف مرتجع بيع RET-' + String(returnDocumentId), returnDocumentId, auth, sale.branch_id, sale.location_id);
    }

    return [returnDocumentId];
  }

  private async createPurchaseReturn(trx: Kysely<Database>, payload: CreateReturnDto, items: ReturnInputItem[], auth: AuthContext): Promise<number[]> {
    const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', Number(payload.invoiceId)).where('status', '=', 'posted').executeTakeFirst();
    if (!purchase) throw new AppError('Invoice not found', 'INVOICE_NOT_FOUND', 404);
    const purchaseItems = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', Number(payload.invoiceId)).execute();

    const normalizedLines: Array<{ productId: number; productName: string; qty: number; unitTotal: number; lineTotal: number }> = [];

    for (const requestItem of items) {
      const purchaseItem = purchaseItems.find((entry) => Number(entry.product_id || 0) === Number(requestItem.productId));
      if (!purchaseItem) throw new AppError('العنصر المطلوب غير موجود.', 'NOT_FOUND', 404);
      const alreadyReturnedQty = await this.getReturnedQty(trx, 'purchase', Number(payload.invoiceId), requestItem.productId);
      const purchasedQty = Number(purchaseItem.qty || 0);
      ensureReturnQtyWithinLimit(requestItem.qty, alreadyReturnedQty, purchasedQty);
      const availableQty = await previewConsumableStockQty(trx, { productId: requestItem.productId, branchId: purchase.branch_id, locationId: purchase.location_id });
      const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', requestItem.productId).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const preparedLine = buildPurchaseReturnLine(purchaseItem, { ...product, stock_qty: availableQty }, requestItem);
      const stockChange = await applyStockDelta(trx, {
        productId: requestItem.productId,
        delta: -preparedLine.stockDelta,
        branchId: purchase.branch_id,
        locationId: purchase.location_id,
        errorCode: 'PURCHASE_RETURN_STOCK_INVALID',
        errorMessage: 'المخزون الحالي لا يسمح بتنفيذ مرتجع الشراء لهذا الصنف',
      });
      await trx.insertInto('stock_movements').values({
        product_id: requestItem.productId,
        movement_type: 'purchase_return',
        qty: -preparedLine.stockDelta,
        before_qty: stockChange.scopeBefore,
        after_qty: stockChange.scopeAfter,
        reason: 'purchase_return',
        note: 'مرتجع شراء على الفاتورة PUR-' + String(purchase.id),
        reference_type: 'purchase_return',
        reference_id: Number(payload.invoiceId),
        branch_id: purchase.branch_id,
        location_id: purchase.location_id,
        created_by: auth.userId,
      }).execute();
      normalizedLines.push({
        productId: preparedLine.productId,
        productName: preparedLine.productName,
        qty: preparedLine.qty,
        unitTotal: preparedLine.unitTotal,
        lineTotal: preparedLine.lineTotal,
      });
    }

    const total = calculateReturnDocumentTotal(normalizedLines);
    const refundMethod = payload.refundMethod === 'card' ? 'card' : 'cash';
    const returnDocumentId = await this.insertReturnDocument(trx, {
      returnType: 'purchase',
      invoiceId: Number(payload.invoiceId),
      settlementMode: 'refund',
      refundMethod,
      total,
      note: String(payload.note || '').trim(),
      branchId: purchase.branch_id,
      locationId: purchase.location_id,
    }, auth);

    for (const line of normalizedLines) {
      await this.insertReturnItem(trx, {
        returnDocumentId,
        productId: line.productId,
        productName: line.productName,
        qty: line.qty,
        unitTotal: line.unitTotal,
        lineTotal: line.lineTotal,
      });
    }

    if (purchase.payment_type === 'credit' && purchase.supplier_id) {
      await this.addSupplierLedgerEntry(trx, Number(purchase.supplier_id), -total, 'purchase_return', 'مرتجع شراء RET-' + String(returnDocumentId), returnDocumentId, auth, purchase.branch_id, purchase.location_id);
    } else {
      await this.addTreasuryTransaction(trx, 'purchase_return_refund', total, 'تحصيل مرتجع شراء RET-' + String(returnDocumentId), returnDocumentId, auth, purchase.branch_id, purchase.location_id);
    }

    return [returnDocumentId];
  }
}
