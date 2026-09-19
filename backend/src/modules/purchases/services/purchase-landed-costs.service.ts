import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../../common/utils/document-number.util';
import { ApplyPurchaseLandedCostsDto } from '../dto/purchase-landed-cost.dto';

@Injectable()
export class PurchaseLandedCostsService {
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
   * Resolve a system account by code, creating it when missing.
   * Guarding the journal with `if (account)` silently skipped posting while the perpetual cost had
   * already moved, leaving the ledger and inventory valuation permanently out of step.
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
      '1140': { ar: 'مخزون بضاعة ومواد خام', en: 'Inventory', type: 'asset', group: 'current_assets', balance: 'debit' },
      '5110': { ar: 'تكلفة البضاعة المباعة', en: 'Cost of Goods Sold', type: 'expense', group: 'expenses', balance: 'debit' },
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

  async getPurchaseLandedCosts(purchaseId: number, auth: AuthContext): Promise<any> {
    const scope = requireTenantScope(auth);

    const purchase = await (this.db as any)
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .where('p.id', '=', purchaseId)
      .where(this.tenantPredicate(auth, 'p'))
      .select([
        'p.id',
        'p.doc_no',
        'p.supplier_id',
        's.name as supplier_name',
        'p.subtotal',
        'p.total',
        'p.landed_cost_total',
        'p.landed_cost_allocation_method',
        'p.landed_cost_notes',
        'p.landed_cost_applied_at',
        'p.created_at',
      ])
      .executeTakeFirst();

    if (!purchase) {
      throw new NotFoundException('فاتورة المشتريات غير موجودة.');
    }

    const items = await (this.db as any)
      .selectFrom('purchase_items as pi')
      .where('pi.purchase_id', '=', purchaseId)
      .where(this.tenantPredicate(auth, 'pi'))
      .select([
        'pi.id',
        'pi.product_id',
        'pi.product_name',
        'pi.qty',
        'pi.unit_cost',
        'pi.line_total',
        'pi.unit_name',
        'pi.allocated_landed_cost',
        'pi.landed_unit_cost',
      ])
      .orderBy('pi.id', 'asc')
      .execute();

    const landedCosts = await (this.db as any)
      .selectFrom('purchase_landed_costs as plc')
      .where('plc.purchase_id', '=', purchaseId)
      .where(this.tenantPredicate(auth, 'plc'))
      .selectAll()
      .orderBy('plc.id', 'asc')
      .execute();

    return {
      purchase: {
        id: Number(purchase.id),
        docNo: purchase.doc_no,
        supplierId: purchase.supplier_id ? Number(purchase.supplier_id) : null,
        supplierName: purchase.supplier_name || 'مورد عام',
        subtotal: Number(purchase.subtotal || 0),
        total: Number(purchase.total || 0),
        landedCostTotal: Number(purchase.landed_cost_total || 0),
        landedCostAllocationMethod: purchase.landed_cost_allocation_method || 'value',
        landedCostNotes: purchase.landed_cost_notes || '',
        landedCostAppliedAt: purchase.landed_cost_applied_at,
        createdAt: purchase.created_at,
      },
      costs: landedCosts.map((c: any) => ({
        id: Number(c.id),
        costType: c.cost_type,
        description: c.description,
        amount: Number(c.amount || 0),
        vendorId: c.vendor_id ? Number(c.vendor_id) : null,
        allocationMethod: c.allocation_method,
      })),
      items: items.map((it: any) => ({
        id: Number(it.id),
        productId: it.product_id ? Number(it.product_id) : null,
        productName: it.product_name,
        qty: Number(it.qty || 0),
        unitCost: Number(it.unit_cost || 0),
        lineTotal: Number(it.line_total || 0),
        unitName: it.unit_name,
        allocatedLandedCost: Number(it.allocated_landed_cost || 0),
        landedUnitCost: it.landed_unit_cost ? Number(it.landed_unit_cost) : Number(it.unit_cost || 0),
      })),
    };
  }

  async applyPurchaseLandedCosts(
    purchaseId: number,
    dto: ApplyPurchaseLandedCostsDto,
    auth: AuthContext,
  ): Promise<any> {
    const scope = requireTenantScope(auth);

    return await this.db.transaction().execute(async (trx: any) => {
      const purchase = await trx
        .selectFrom('purchases')
        .where('id', '=', purchaseId)
        .where(this.tenantPredicate(auth))
        .select(['id', 'doc_no', 'subtotal', 'total', 'status', 'supplier_id', 'landed_cost_applied_at', 'created_at'])
        .forUpdate()
        .executeTakeFirst();

      if (!purchase) {
        throw new NotFoundException('فاتورة المشتريات غير موجودة.');
      }

      if (purchase.status === 'cancelled') {
        throw new BadRequestException('لا يمكن تحميل تكاليف إضافية على فاتورة ملغاة.');
      }

      // landed_cost_applied_at was written but never read, so re-running this compounded the cost
      // into products.cost_price without limit and double-posted the capitalisation journal.
      if (purchase.landed_cost_applied_at) {
        throw new BadRequestException(
          `سبق تحميل تكاليف إضافية على هذه الفاتورة بتاريخ ${new Date(purchase.landed_cost_applied_at).toISOString().slice(0, 10)}. لإعادة التحميل يلزم عكس التحميل السابق أولاً.`,
        );
      }

      const items = await trx
        .selectFrom('purchase_items')
        .where('purchase_id', '=', purchaseId)
        .where(this.tenantPredicate(auth))
        .selectAll()
        .execute();

      if (!items.length) {
        throw new BadRequestException('الفاتورة لا تحتوي على أي بنود لتحميل التكلفة عليها.');
      }

      const totalLandedCost = dto.costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      // Split of the allocation between inventory still held and units already sold.
      let totalCapitalisedLandedCost = 0;
      let totalCogsLandedCost = 0;
      const totalPurchaseValue = items.reduce((sum: number, it: any) => sum + Number(it.line_total || 0), 0);
      const totalPurchaseQty = items.reduce((sum: number, it: any) => sum + Number(it.qty || 0), 0);

      // 1. Delete previous landed costs for this purchase
      await trx
        .deleteFrom('purchase_landed_costs')
        .where('purchase_id', '=', purchaseId)
        .where(this.tenantPredicate(auth))
        .execute();

      // 2. Insert new landed costs breakdown
      if (dto.costs.length > 0) {
        const costRows = dto.costs.map((c) => ({
          tenant_id: scope.tenantId,
          purchase_id: purchaseId,
          cost_type: c.costType,
          description: c.description,
          amount: Number(c.amount),
          vendor_id: c.vendorId || null,
          allocation_method: dto.allocationMethod,
        }));
        await trx.insertInto('purchase_landed_costs').values(costRows).execute();
      }

      // 3. Allocate across items with Weighted Average Cost (WAC) protection
      for (const item of items) {
        const itemQty = Number(item.qty || 1);
        const itemValue = Number(item.line_total || 0);

        let ratio = 0;
        if (dto.allocationMethod === 'value') {
          ratio = totalPurchaseValue > 0 ? itemValue / totalPurchaseValue : 1 / items.length;
        } else if (dto.allocationMethod === 'qty') {
          ratio = totalPurchaseQty > 0 ? itemQty / totalPurchaseQty : 1 / items.length;
        } else {
          ratio = 1 / items.length;
        }

        const allocatedCost = Number((totalLandedCost * ratio).toFixed(2));
        const baseUnitCost = Number(item.unit_cost || 0);
        const landedUnitCost = Number((baseUnitCost + (itemQty > 0 ? allocatedCost / itemQty : 0)).toFixed(2));

        // Update purchase_item
        await trx
          .updateTable('purchase_items')
          .set({
            allocated_landed_cost: allocatedCost,
            landed_unit_cost: landedUnitCost,
          })
          .where('id', '=', item.id)
          .where(this.tenantPredicate(auth))
          .execute();

        // Update product cost using weighted average, splitting the allocation between the units
        // still on hand (capitalised) and the units already sold (charged to COGS).
        //
        // The previous logic spread the ENTIRE allocated cost over remaining stock, so the share
        // belonging to already-sold units inflated the cost of what was left instead of hitting
        // cost of sales — and when most units had been sold it overwrote the running average with
        // this shipment's unit cost outright, discarding the weighted average completely.
        if (item.product_id && allocatedCost > 0) {
          const prod = await trx
            .selectFrom('products')
            .select(['id', 'stock_qty', 'cost_price'])
            .where('id', '=', Number(item.product_id))
            .where(this.tenantPredicate(auth))
            .forUpdate()
            .executeTakeFirst();

          if (prod) {
            const currentStock = Number(prod.stock_qty || 0);
            const currentCost = Number(prod.cost_price || 0);

            // Units of this receipt still on hand, capped by what was actually received.
            const remainingOfReceipt = Math.max(0, Math.min(itemQty, currentStock));
            const soldOfReceipt = Math.max(0, itemQty - remainingOfReceipt);

            const perUnitLanded = itemQty > 0 ? allocatedCost / itemQty : 0;
            const capitalisedPortion = Number((perUnitLanded * remainingOfReceipt).toFixed(4));
            const cogsPortion = Number((perUnitLanded * soldOfReceipt).toFixed(4));

            totalCapitalisedLandedCost += capitalisedPortion;
            totalCogsLandedCost += cogsPortion;

            if (currentStock > 0 && capitalisedPortion > 0) {
              const newCostPrice = Number((((currentStock * currentCost) + capitalisedPortion) / currentStock).toFixed(6));
              if (newCostPrice >= 0) {
                await trx
                  .updateTable('products')
                  .set({ cost_price: newCostPrice, updated_at: new Date() })
                  .where('id', '=', Number(item.product_id))
                  .where(this.tenantPredicate(auth))
                  .execute();
              }
            }
          }
        }
      }

      // 4. Update purchase header
      await trx
        .updateTable('purchases')
        .set({
          landed_cost_total: totalLandedCost,
          landed_cost_allocation_method: dto.allocationMethod,
          landed_cost_notes: dto.notes || null,
          landed_cost_applied_at: new Date(),
        })
        .where('id', '=', purchaseId)
        .where(this.tenantPredicate(auth))
        .execute();

      // 5. Generate Accounting Journal Entry for Landed Cost (Dr. Inventory 1140 / Cr. AP 2110)
      if (totalLandedCost > 0) {
        const settings = await trx
          .selectFrom('accounting_settings')
          .selectAll()
          .where('tenant_id', '=', scope.tenantId)
          .where('id', '=', 1)
          .executeTakeFirst();

        const invAccount = await this.resolveAccountByCode(trx, scope.tenantId, scope.accountId, '1140');
        const cogsAccount = await this.resolveAccountByCode(trx, scope.tenantId, scope.accountId, '5110');

        const payableAccountId = Number(settings?.supplier_payable_account_id || 0);

        // Never skip the journal silently: products.cost_price has already been changed above, so
        // a skipped entry leaves the perpetual cost and the general ledger permanently divergent.
        if (!invAccount || !(payableAccountId > 0)) {
          throw new BadRequestException(
            'تعذر إثبات التكاليف الإضافية: حساب المخزون (1140) أو حساب الموردين غير مهيأ في شجرة الحسابات.',
          );
        }

        // Post on the purchase date, not today. Customs cleared in March for a December shipment
        // was landing in March — a different period, and often a different fiscal year.
        const entryDate = purchase.created_at ? new Date(purchase.created_at) : new Date();
        const entryDateStr = entryDate.toISOString().slice(0, 10);
        const lockAllStr = settings?.lock_date_all ? String(settings.lock_date_all).slice(0, 10) : '';
        if (lockAllStr && entryDateStr <= lockAllStr) {
          throw new BadRequestException(
            `لا يمكن إثبات التكاليف الإضافية في فترة محاسبية مقفلة (تاريخ القفل: ${lockAllStr}).`,
          );
        }

        {
          const [entry] = await trx
            .insertInto('journal_entries')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId || scope.tenantId,
              // Temp number then rename by id: COUNT(*)+1 collided under concurrency.
              entry_no: `JRN-TMP-LC-${purchaseId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              entry_date: entryDate,
              description: `إثبات تكاليف إضافية (شحن/جمارك) لفاتورة شراء ${purchase.doc_no || purchaseId}`,
              source_type: 'purchase_landed_cost',
              source_id: purchaseId,
              status: 'posted',
              created_by: auth.userId,
            })
            .returning(['id'])
            .execute();

          await trx
            .updateTable('journal_entries')
            .set({ entry_no: formatDailyDocumentNumber('JRN', Number(entry.id)), updated_at: new Date() })
            .where('id', '=', Number(entry.id))
            .where('tenant_id', '=', scope.tenantId)
            .execute();

          // Split the debit: the portion belonging to units already sold is a period cost and
          // belongs in COGS, not capitalised into the remaining inventory.
          const capitalised = Number(totalCapitalisedLandedCost.toFixed(2));
          const toCogs = Number((Number(totalLandedCost.toFixed(2)) - capitalised).toFixed(2));

          const debitLines: any[] = [];
          if (capitalised > 0.001) {
            debitLines.push({
              journal_entry_id: Number(entry.id),
              tenant_id: scope.tenantId,
              account_id: Number(invAccount),
              description: `تحميل تكاليف إضافية على المخزون - فاتورة ${purchase.doc_no || purchaseId}`,
              debit: capitalised,
              credit: 0,
              partner_type: 'none',
              partner_id: null,
            });
          }
          if (toCogs > 0.001 && cogsAccount) {
            debitLines.push({
              journal_entry_id: Number(entry.id),
              tenant_id: scope.tenantId,
              account_id: Number(cogsAccount),
              description: `نصيب الوحدات المباعة من التكاليف الإضافية - فاتورة ${purchase.doc_no || purchaseId}`,
              debit: toCogs,
              credit: 0,
              partner_type: 'none',
              partner_id: null,
            });
          } else if (toCogs > 0.001) {
            // No COGS account available: capitalise rather than unbalance the entry.
            debitLines.push({
              journal_entry_id: Number(entry.id),
              tenant_id: scope.tenantId,
              account_id: Number(invAccount),
              description: `تحميل تكاليف إضافية (تعذر فصل نصيب المبيعات) - فاتورة ${purchase.doc_no || purchaseId}`,
              debit: toCogs,
              credit: 0,
              partner_type: 'none',
              partner_id: null,
            });
          }

          await trx
            .insertInto('journal_entry_lines')
            .values([
              ...debitLines,
              {
                journal_entry_id: Number(entry.id),
                tenant_id: scope.tenantId,
                account_id: payableAccountId,
                description: `استحقاق تكاليف شحن/جمارك إضافية - فاتورة ${purchase.doc_no || purchaseId}`,
                debit: 0,
                credit: Number(totalLandedCost.toFixed(2)),
                partner_type: 'supplier',
                partner_id: purchase.supplier_id ? Number(purchase.supplier_id) : null,
              },
            ])
            .execute();
        }
      }

      return this.getPurchaseLandedCosts(purchaseId, auth);
    });
  }
}
