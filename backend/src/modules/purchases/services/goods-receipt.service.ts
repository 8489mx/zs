import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../../common/utils/document-number.util';
import { CreateGoodsReceiptDto, VerifyThreeWayMatchDto } from '../dto/goods-receipt.dto';
import { computeThreeWayMatch, ThreeWayMatchInput } from '../three-way-match.engine';
import { applyStockDelta } from '../../../common/utils/location-stock-ledger';

@Injectable()
export class GoodsReceiptService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  private tenantPredicate(auth: AuthContext, alias?: string) {
    const scope = requireTenantScope(auth);
    return alias
      ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${scope.tenantId}`
      : sql<boolean>`tenant_id = ${scope.tenantId}`;
  }

  /**
   * Resolve a system account by code, creating it when the tenant's chart lacks it.
   * The previous `if (account) { ...post... }` pattern silently skipped the whole journal when an
   * account was missing, while the stock side had already been written.
   */
  private async resolveAccountByCode(trx: any, tenantId: string, accountId: string, code: string): Promise<number | null> {
    const existing = await trx
      .selectFrom('accounting_accounts')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', '=', code)
      .executeTakeFirst();
    if (existing) return Number(existing.id);

    const known: Record<string, { ar: string; en: string; type: string; group: string; balance: string }> = {
      '2125': { ar: 'بضاعة مستلمة غير مفوترة', en: 'Goods Received Not Invoiced', type: 'liability', group: 'current_liabilities', balance: 'credit' },
      '1140': { ar: 'مخزون بضاعة ومواد خام', en: 'Inventory', type: 'asset', group: 'current_assets', balance: 'debit' },
      '5190': { ar: 'فروق أسعار مشتريات', en: 'Purchase Price Variance', type: 'expense', group: 'expenses', balance: 'debit' },
    };
    const spec = known[code];
    if (!spec) return null;

    const [created] = await trx
      .insertInto('accounting_accounts')
      .values({
        tenant_id: tenantId,
        account_id: accountId || tenantId,
        code,
        name_ar: spec.ar,
        name_en: spec.en,
        account_type: spec.type,
        account_group: spec.group,
        normal_balance: spec.balance,
        is_active: true,
        is_system: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id')
      .execute();
    return created ? Number(created.id) : null;
  }

  async createGoodsReceipt(dto: CreateGoodsReceiptDto, auth: AuthContext): Promise<any> {
    const scope = requireTenantScope(auth);

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('يجب إدخال بند واحد على الأقل في إذن الاستلام.');
    }

    // Verify supplier exists
    const supplier = await (this.db as any)
      .selectFrom('suppliers')
      .select(['id', 'name'])
      .where('id', '=', dto.supplierId)
      .where(this.tenantPredicate(auth))
      .executeTakeFirst();
    if (!supplier) {
      throw new NotFoundException('المورد المحدد غير موجود.');
    }

    // Generate Universal Document Number: GRN-YYMMDD-XXXX
    const prefix = getDailyDocumentPrefix('GRN');
    const countRow = await (this.db as any)
      .selectFrom('goods_receipt_notes')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', scope.tenantId)
      .where('doc_no', 'like', `${prefix}%`)
      .executeTakeFirst();
    const seq = Number(countRow?.count || 0) + 1;
    const docNo = formatDailyDocumentNumber('GRN', seq);

    return await this.db.transaction().execute(async (trx: any) => {
      const [grn] = await trx
        .insertInto('goods_receipt_notes')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId || scope.tenantId,
          doc_no: docNo,
          purchase_order_id: dto.purchaseOrderId || null,
          supplier_id: dto.supplierId,
          location_id: dto.locationId,
          received_at: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
          received_by: auth.userId,
          supplier_delivery_note_ref: dto.supplierDeliveryNoteRef || null,
          status: 'draft',
          notes: dto.notes || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returningAll()
        .execute();

      const lineValues = dto.lines.map((l) => {
        const received = Number(l.receivedQty || 0);
        const accepted = Number(l.acceptedQty || 0);
        const rejected = Number(l.rejectedQty || 0);

        if (Math.abs(received - (accepted + rejected)) > 0.001) {
          throw new BadRequestException(`إجمالي الكمية المستلمة (${received}) يجب أن يساوي المقبول (${accepted}) + المرفوض (${rejected}).`);
        }

        return {
          tenant_id: scope.tenantId,
          grn_id: Number(grn.id),
          purchase_order_item_id: l.purchaseOrderItemId || null,
          product_id: l.productId,
          ordered_qty: Number(l.orderedQty || 0),
          received_qty: received,
          accepted_qty: accepted,
          rejected_qty: rejected,
          rejection_reason: l.rejectionReason || null,
          batch_number: l.batchNumber || null,
          expiry_date: l.expiryDate ? new Date(l.expiryDate) : null,
          manufacturing_date: l.manufacturingDate ? new Date(l.manufacturingDate) : null,
          unit_cost: Number(l.unitCost || 0),
          quarantine_location_id: l.quarantineLocationId || null,
          coa_document_id: l.coaDocumentId || null,
          notes: l.notes || null,
          created_at: new Date(),
        };
      });

      await trx.insertInto('goods_receipt_lines').values(lineValues).execute();

      return this.getGoodsReceipt(Number(grn.id), auth, trx);
    });
  }

  async listGoodsReceipts(filter: { supplierId?: number; status?: string; search?: string }, auth: AuthContext): Promise<any> {
    let query = (this.db as any)
      .selectFrom('goods_receipt_notes as g')
      .leftJoin('suppliers as s', 's.id', 'g.supplier_id')
      .leftJoin('purchase_orders as po', 'po.id', 'g.purchase_order_id')
      .where(this.tenantPredicate(auth, 'g'))
      .select([
        'g.id',
        'g.doc_no',
        'g.purchase_order_id',
        'po.doc_no as po_doc_no',
        'g.supplier_id',
        's.name as supplier_name',
        'g.location_id',
        'g.received_at',
        'g.status',
        'g.supplier_delivery_note_ref',
        'g.grni_journal_entry_id',
        'g.created_at',
      ])
      .orderBy('g.id', 'desc');

    if (filter.supplierId) {
      query = query.where('g.supplier_id', '=', filter.supplierId);
    }
    if (filter.status) {
      query = query.where('g.status', '=', filter.status);
    }
    if (filter.search) {
      const term = `%${filter.search}%`;
      query = query.where((eb: any) =>
        eb.or([
          eb('g.doc_no', 'ilike', term),
          eb('s.name', 'ilike', term),
          eb('g.supplier_delivery_note_ref', 'ilike', term),
        ]),
      );
    }

    const rows = await query.execute();
    return rows.map((r: any) => ({
      id: Number(r.id),
      docNo: r.doc_no,
      purchaseOrderId: r.purchase_order_id ? Number(r.purchase_order_id) : null,
      poDocNo: r.po_doc_no || null,
      supplierId: Number(r.supplier_id),
      supplierName: r.supplier_name || 'مورد عام',
      locationId: Number(r.location_id),
      receivedAt: r.received_at,
      status: r.status,
      supplierDeliveryNoteRef: r.supplier_delivery_note_ref,
      grniJournalEntryId: r.grni_journal_entry_id ? Number(r.grni_journal_entry_id) : null,
      createdAt: r.created_at,
    }));
  }

  async getGoodsReceipt(id: number, auth: AuthContext, externalTrx?: any): Promise<any> {
    const q = externalTrx || (this.db as any);

    const grn = await q
      .selectFrom('goods_receipt_notes as g')
      .leftJoin('suppliers as s', 's.id', 'g.supplier_id')
      .leftJoin('purchase_orders as po', 'po.id', 'g.purchase_order_id')
      .where('g.id', '=', id)
      .where(this.tenantPredicate(auth, 'g'))
      .select([
        'g.id',
        'g.doc_no',
        'g.purchase_order_id',
        'po.doc_no as po_doc_no',
        'g.supplier_id',
        's.name as supplier_name',
        'g.location_id',
        'g.received_at',
        'g.status',
        'g.supplier_delivery_note_ref',
        'g.grni_journal_entry_id',
        'g.notes',
        'g.created_at',
      ])
      .executeTakeFirst();

    if (!grn) {
      throw new NotFoundException(`إذن الاستلام رقم ${id} غير موجود.`);
    }

    const lines = await q
      .selectFrom('goods_receipt_lines as gl')
      .leftJoin('products as p', 'p.id', 'gl.product_id')
      .where('gl.grn_id', '=', id)
      .where(this.tenantPredicate(auth, 'gl'))
      .select([
        'gl.id',
        'gl.product_id',
        'p.name as product_name',
        'p.sku as product_sku',
        'gl.purchase_order_item_id',
        'gl.ordered_qty',
        'gl.received_qty',
        'gl.accepted_qty',
        'gl.rejected_qty',
        'gl.rejection_reason',
        'gl.batch_number',
        'gl.expiry_date',
        'gl.manufacturing_date',
        'gl.unit_cost',
        'gl.quarantine_location_id',
        'gl.coa_document_id',
        'gl.notes',
      ])
      .orderBy('gl.id', 'asc')
      .execute();

    return {
      id: Number(grn.id),
      docNo: grn.doc_no,
      purchaseOrderId: grn.purchase_order_id ? Number(grn.purchase_order_id) : null,
      poDocNo: grn.po_doc_no,
      supplierId: Number(grn.supplier_id),
      supplierName: grn.supplier_name,
      locationId: Number(grn.location_id),
      receivedAt: grn.received_at,
      status: grn.status,
      supplierDeliveryNoteRef: grn.supplier_delivery_note_ref,
      grniJournalEntryId: grn.grni_journal_entry_id ? Number(grn.grni_journal_entry_id) : null,
      notes: grn.notes,
      createdAt: grn.created_at,
      lines: lines.map((l: any) => ({
        id: Number(l.id),
        productId: Number(l.product_id),
        productName: l.product_name,
        productSku: l.product_sku,
        purchaseOrderItemId: l.purchase_order_item_id ? Number(l.purchase_order_item_id) : null,
        orderedQty: Number(l.ordered_qty || 0),
        receivedQty: Number(l.received_qty || 0),
        acceptedQty: Number(l.accepted_qty || 0),
        rejectedQty: Number(l.rejected_qty || 0),
        rejectionReason: l.rejection_reason,
        batchNumber: l.batch_number,
        expiryDate: l.expiry_date,
        manufacturingDate: l.manufacturing_date,
        unitCost: Number(l.unit_cost || 0),
        quarantineLocationId: l.quarantine_location_id ? Number(l.quarantine_location_id) : null,
        coaDocumentId: l.coa_document_id ? Number(l.coa_document_id) : null,
        notes: l.notes,
      })),
    };
  }

  async postGoodsReceipt(id: number, auth: AuthContext): Promise<any> {
    const scope = requireTenantScope(auth);

    return await this.db.transaction().execute(async (trx: any) => {
      // 1. Pessimistic lock on GRN header to prevent concurrent double-posting
      const grnRow = await trx
        .selectFrom('goods_receipt_notes')
        .selectAll()
        .where('id', '=', id)
        .where(this.tenantPredicate(auth))
        .forUpdate()
        .executeTakeFirst();

      if (!grnRow) {
        throw new NotFoundException(`إذن الاستلام رقم ${id} غير موجود.`);
      }

      if (grnRow.status === 'posted') {
        throw new BadRequestException('تم ترحيل إذن الاستلام هذا مسبقاً.');
      }

      const grn = await this.getGoodsReceipt(id, auth, trx);
      let totalGrniAmount = 0;

      // Stock movements must carry branch attribution like every other stock path does.
      const grnLocation = await trx
        .selectFrom('stock_locations')
        .select('branch_id')
        .where('id', '=', grn.locationId)
        .where('tenant_id', '=', scope.tenantId)
        .executeTakeFirst();
      const grnBranchId = grnLocation?.branch_id != null ? Number(grnLocation.branch_id) : null;

      // 2. Update physical inventory for accepted quantities & write audit movements
      for (const line of grn.lines) {
        const accepted = Number(line.acceptedQty || 0);
        if (accepted > 0) {
          const lineUnitCost = Number(line.unitCost || 0);
          totalGrniAmount += accepted * lineUnitCost;

          // Route stock through the shared ledger helper instead of writing the two balance tables
          // by hand. Doing it by hand skipped the canonical lock order (products BEFORE
          // product_location_stock), which deadlocked against concurrent sales, and produced
          // stock_movements rows whose before/after balances were hardcoded 0 / accepted.
          const stockChange = await applyStockDelta(trx, {
            productId: Number(line.productId),
            delta: accepted,
            branchId: grnBranchId,
            locationId: grn.locationId,
            tenantId: scope.tenantId,
            accountId: scope.accountId || scope.tenantId,
            allowNegative: true, // a receipt only adds; never reject it on a negative-stock rule
          });

          // Moving average cost on receipt. Without this, goods arriving at a new price never
          // updated products.cost_price, so COGS kept using a stale cost indefinitely.
          const prod = await trx
            .selectFrom('products')
            .select(['stock_qty', 'cost_price'])
            .where('id', '=', Number(line.productId))
            .where('tenant_id', '=', scope.tenantId)
            .executeTakeFirst();

          if (prod && lineUnitCost > 0) {
            const qtyBefore = Number(stockChange.globalBefore || 0);
            const costBefore = Number(prod.cost_price || 0);
            // V1: never average against a non-positive prior balance — that yields a negative or
            // absurd unit cost. Fall back to the incoming cost.
            const newCost =
              qtyBefore > 0
                ? Number((((qtyBefore * costBefore) + (accepted * lineUnitCost)) / (qtyBefore + accepted)).toFixed(6))
                : lineUnitCost;

            if (newCost >= 0) {
              await trx
                .updateTable('products')
                .set({ cost_price: newCost, updated_at: new Date() })
                .where('id', '=', Number(line.productId))
                .where('tenant_id', '=', scope.tenantId)
                .execute();
            }
          }

          // Record formal stock movement with the real running balances.
          await trx
            .insertInto('stock_movements')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId || scope.tenantId,
              product_id: line.productId,
              movement_type: 'goods_receipt',
              qty: accepted,
              before_qty: stockChange.scopeBefore,
              after_qty: stockChange.scopeAfter,
              unit_cost: lineUnitCost,
              total_cost: Number((accepted * lineUnitCost).toFixed(4)),
              reason: 'goods_receipt',
              note: `إذن استلام مخزني GRN - ${grn.docNo}`,
              reference_type: 'goods_receipt',
              reference_id: grn.id,
              branch_id: grnBranchId,
              location_id: grn.locationId,
              created_by: auth.userId,
            })
            .execute();
        }
      }

      // 3. Generate GRNI Journal Entry (Dr. Inventory Asset 1140 / Cr. GRNI 2125)
      let grniEntryId: number | null = null;
      if (totalGrniAmount > 0) {
        const entryDate = grn.receivedAt ? new Date(grn.receivedAt) : new Date();

        // Enforce fiscal period lock check
        const settings = await trx
          .selectFrom('accounting_settings')
          .selectAll()
          .where('tenant_id', '=', scope.tenantId)
          .where('id', '=', 1)
          .executeTakeFirst();

        // Compare as YYYY-MM-DD strings, matching insertPostedJournal. Comparing Date objects let a
        // receipt timestamped 09:00 on the lock date pass here while being blocked everywhere else.
        const entryDateStr = entryDate.toISOString().slice(0, 10);
        const lockAllStr = settings?.lock_date_all ? String(settings.lock_date_all).slice(0, 10) : '';
        if (lockAllStr && entryDateStr <= lockAllStr) {
          throw new BadRequestException(`لا يمكن ترحيل إذن الاستلام في فترة محاسبية مقفلة (تاريخ القفل: ${lockAllStr})`);
        }

        const grniAccount = await this.resolveAccountByCode(trx, scope.tenantId, scope.accountId, '2125');
        const invAccount = await this.resolveAccountByCode(trx, scope.tenantId, scope.accountId, '1140');

        // Never skip the journal silently. Stock has already been increased above; posting the GRN
        // without its GRNI liability would leave the books short by the full receipt value with no
        // error and no trace.
        if (!grniAccount || !invAccount) {
          throw new BadRequestException(
            'تعذر ترحيل إذن الاستلام: حساب استحقاق البضاعة المستلمة (2125) أو حساب المخزون (1140) غير متاح في شجرة الحسابات.',
          );
        }

        // Insert with a collision-proof temporary number, then rename by id.
        // COUNT(*)+1 made two concurrent postings on the same day generate the same entry_no.
        const [entry] = await trx
          .insertInto('journal_entries')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId || scope.tenantId,
            entry_no: `JRN-TMP-GRN-${grn.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            entry_date: entryDate,
            description: `إثبات استلام بضاعة مخزنية GRNI - إذن رقم ${grn.docNo}`,
            source_type: 'goods_receipt',
            source_id: grn.id,
            status: 'posted',
            created_by: auth.userId,
          })
          .returning(['id'])
          .execute();

        grniEntryId = Number(entry.id);

        await trx
          .updateTable('journal_entries')
          .set({ entry_no: formatDailyDocumentNumber('JRN', grniEntryId), updated_at: new Date() })
          .where('id', '=', grniEntryId)
          .where('tenant_id', '=', scope.tenantId)
          .execute();

        const grniAmount = Number(totalGrniAmount.toFixed(2));

        await trx
          .insertInto('journal_entry_lines')
          .values([
            {
              journal_entry_id: grniEntryId,
              tenant_id: scope.tenantId,
              account_id: Number(invAccount),
              description: `إضافة مخزون مستلم - ${grn.docNo}`,
              debit: grniAmount,
              credit: 0,
              // Inventory is not a supplier sub-ledger account. Tagging it with the supplier
              // polluted supplier statements and aging with inventory debits.
              partner_type: 'none',
              partner_id: null,
            },
            {
              journal_entry_id: grniEntryId,
              tenant_id: scope.tenantId,
              account_id: Number(grniAccount),
              description: `استحقاق بضاعة مستلمة غير مفوترة GRNI - ${grn.docNo}`,
              debit: 0,
              credit: grniAmount,
              partner_type: 'supplier',
              partner_id: grn.supplierId,
            },
          ])
          .execute();
      }

      await trx
        .updateTable('goods_receipt_notes')
        .set({
          status: 'posted',
          grni_journal_entry_id: grniEntryId,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where(this.tenantPredicate(auth))
        .execute();

      return {
        success: true,
        grnId: id,
        docNo: grn.docNo,
        status: 'posted',
        grniJournalEntryId: grniEntryId,
        totalGrniAmount: Number(totalGrniAmount.toFixed(2)),
      };
    });
  }

  async verifyPurchaseThreeWayMatch(purchaseId: number, dto: VerifyThreeWayMatchDto, auth: AuthContext): Promise<any> {
    const scope = requireTenantScope(auth);

    const purchase = await (this.db as any)
      .selectFrom('purchases')
      .where('id', '=', purchaseId)
      .where(this.tenantPredicate(auth))
      .selectAll()
      .executeTakeFirst();

    if (!purchase) {
      throw new NotFoundException(`فاتورة المشتريات رقم ${purchaseId} غير موجودة.`);
    }

    const purchaseItems = await (this.db as any)
      .selectFrom('purchase_items')
      .where('purchase_id', '=', purchaseId)
      .where(this.tenantPredicate(auth))
      .selectAll()
      .execute();

    // Fetch PO items if purchase is linked to a PO.
    // purchases.po_id is added by migration 113; before it existed this was always undefined and the
    // price-variance leg of the match could never fire.
    let poItems: any[] = [];
    const linkedPoId = purchase.po_id ? Number(purchase.po_id) : null;
    if (linkedPoId) {
      poItems = await (this.db as any)
        .selectFrom('purchase_order_items')
        .where('purchase_order_id', '=', linkedPoId)
        .where(this.tenantPredicate(auth))
        .selectAll()
        .execute();
    }

    // Fetch GRN lines if purchase is linked to GRN or PO
    let grnLines: any[] = [];
    if (purchase.grn_id) {
      grnLines = await (this.db as any)
        .selectFrom('goods_receipt_lines')
        .where('grn_id', '=', purchase.grn_id)
        .where(this.tenantPredicate(auth))
        .selectAll()
        .execute();
    } else if (linkedPoId) {
      const grns = await (this.db as any)
        .selectFrom('goods_receipt_notes')
        .select('id')
        .where('purchase_order_id', '=', linkedPoId)
        .where('status', '=', 'posted')
        .where(this.tenantPredicate(auth))
        .execute();
      const grnIds = grns.map((g: any) => Number(g.id));
      if (grnIds.length > 0) {
        grnLines = await (this.db as any)
          .selectFrom('goods_receipt_lines')
          .where('grn_id', 'in', grnIds)
          .where(this.tenantPredicate(auth))
          .selectAll()
          .execute();
      }
    }

    // MATCH-1 requires the quantities already invoiced against this PO/GRN by OTHER purchase
    // invoices. Without it priorQty was always 0, so the same delivery could be billed and paid
    // an unlimited number of times — the precise fraud this invariant exists to prevent.
    let historicalInvoicedLines: Array<{ poItemId?: number; productId: number; qty: number }> = [];
    if (linkedPoId || purchase.grn_id) {
      let histQuery = (this.db as any)
        .selectFrom('purchase_items as pi')
        .innerJoin('purchases as p', 'p.id', 'pi.purchase_id')
        .select(['pi.po_item_id', 'pi.product_id', 'pi.qty'])
        .where('p.tenant_id', '=', scope.tenantId)
        .where('p.id', '!=', purchaseId)
        .where('p.status', '!=', 'cancelled');

      histQuery = linkedPoId
        ? histQuery.where('p.po_id', '=', linkedPoId)
        : histQuery.where('p.grn_id', '=', Number(purchase.grn_id));

      const histRows = await histQuery.execute();
      historicalInvoicedLines = histRows.map((r: any) => ({
        poItemId: r.po_item_id ? Number(r.po_item_id) : undefined,
        productId: Number(r.product_id),
        qty: Number(r.qty || 0),
      }));
    }

    // Separation of duties: the person keying the invoice cannot clear their own block.
    // A full override (accepting goods never received) requires elevated authority.
    const requestedScope = dto.overrideScope === 'full' ? 'full' : 'price_only';
    if (dto.allowOverride) {
      const role = String(auth.role || '').trim();
      const canOverridePrice = ['admin', 'super_admin', 'manager', 'accountant'].includes(role);
      const canOverrideFull = ['admin', 'super_admin'].includes(role);
      if (!canOverridePrice || (requestedScope === 'full' && !canOverrideFull)) {
        throw new BadRequestException(
          'صلاحيتك لا تسمح بتجاوز نتيجة المطابقة الثلاثية بهذا النطاق. تجاوز فروق الكميات يتطلب اعتماد الإدارة.',
        );
      }
      if (String(dto.overrideReason || '').trim().length < 10) {
        throw new BadRequestException('يجب توثيق سبب تفصيلي (10 أحرف على الأقل) لتجاوز المطابقة الثلاثية.');
      }
    }

    // Build ThreeWayMatchInput
    const input: ThreeWayMatchInput = {
      historicalInvoicedLines,
      overrideScope: requestedScope,
      poItems: poItems.map((poi: any) => ({
        id: Number(poi.id),
        productId: Number(poi.product_id),
        qty: Number(poi.qty || 0),
        unitCost: Number(poi.unit_cost || 0),
        isService: Boolean(poi.is_service),
      })),
      grnLines: grnLines.map((gl: any) => ({
        id: Number(gl.id),
        grnId: Number(gl.grn_id),
        poItemId: gl.purchase_order_item_id ? Number(gl.purchase_order_item_id) : undefined,
        productId: Number(gl.product_id),
        receivedQty: Number(gl.received_qty || 0),
        acceptedQty: Number(gl.accepted_qty || 0),
        rejectedQty: Number(gl.rejected_qty || 0),
        unitCost: Number(gl.unit_cost || 0),
      })),
      invoiceItems: purchaseItems.map((pi: any) => ({
        id: Number(pi.id),
        poItemId: pi.po_item_id ? Number(pi.po_item_id) : undefined,
        grnLineId: pi.grn_line_id ? Number(pi.grn_line_id) : undefined,
        productId: Number(pi.product_id),
        qty: Number(pi.qty || 0),
        unitCost: Number(pi.unit_cost || 0),
      })),
      tolerancePercentage: dto.tolerancePercentage,
      isServiceItem: dto.isServiceItem,
      serviceCompletionRef: dto.serviceCompletionRef,
      allowOverride: dto.allowOverride,
      overrideReason: dto.overrideReason,
    };

    const matchResult = computeThreeWayMatch(input);

    // Real quantity variance instead of the hardcoded 0 that previously misrepresented every record.
    const qtyVariance = Number(
      matchResult.lines
        .reduce((sum, l) => sum + Math.max(0, l.cumulativeInvoicedQty - l.acceptedGrnQty), 0)
        .toFixed(4),
    );

    // Both writes in one transaction: previously a failure between them left the match table and
    // the purchase header disagreeing about whether the invoice was matched.
    await this.db.transaction().execute(async (trx: any) => {
      await trx
        .insertInto('purchase_three_way_matches')
        .values({
          tenant_id: scope.tenantId,
          purchase_id: purchaseId,
          purchase_order_id: linkedPoId,
          grn_id: purchase.grn_id || null,
          match_status: matchResult.overallStatus,
          price_variance_amount: matchResult.totalPpv,
          qty_variance_amount: qtyVariance,
          tolerance_percentage: matchResult.tolerancePercentage,
          is_service_item: Boolean(dto.isServiceItem),
          service_completion_ref: dto.serviceCompletionRef || null,
          override_approved_by: dto.allowOverride ? auth.userId : null,
          override_reason: dto.overrideReason || null,
          override_scope: dto.allowOverride ? requestedScope : null,
          blocking_codes: matchResult.blockingCodes,
          reconciliation_discrepancy: matchResult.reconciliationDiscrepancy,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict((oc: any) =>
          oc.columns(['tenant_id', 'purchase_id']).doUpdateSet({
            purchase_order_id: linkedPoId,
            match_status: matchResult.overallStatus,
            price_variance_amount: matchResult.totalPpv,
            qty_variance_amount: qtyVariance,
            override_approved_by: dto.allowOverride ? auth.userId : null,
            override_reason: dto.overrideReason || null,
            override_scope: dto.allowOverride ? requestedScope : null,
            blocking_codes: matchResult.blockingCodes,
            reconciliation_discrepancy: matchResult.reconciliationDiscrepancy,
            updated_at: new Date(),
          }),
        )
        .execute();

      await trx
        .updateTable('purchases')
        .set({ three_way_match_status: matchResult.overallStatus })
        .where('id', '=', purchaseId)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    });

    return matchResult;
  }
}
