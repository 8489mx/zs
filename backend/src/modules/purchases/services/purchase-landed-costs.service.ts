import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
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

    const purchase = await (this.db as any)
      .selectFrom('purchases')
      .where('id', '=', purchaseId)
      .where(this.tenantPredicate(auth))
      .select(['id', 'subtotal', 'total', 'status'])
      .executeTakeFirst();

    if (!purchase) {
      throw new NotFoundException('فاتورة المشتريات غير موجودة.');
    }

    if (purchase.status === 'cancelled') {
      throw new BadRequestException('لا يمكن تحميل تكاليف إضافية على فاتورة ملغاة.');
    }

    const items = await (this.db as any)
      .selectFrom('purchase_items')
      .where('purchase_id', '=', purchaseId)
      .where(this.tenantPredicate(auth))
      .selectAll()
      .execute();

    if (!items.length) {
      throw new BadRequestException('الفاتورة لا تحتوي على أي بنود لتحميل التكلفة عليها.');
    }

    const totalLandedCost = dto.costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalPurchaseValue = items.reduce((sum: number, it: any) => sum + Number(it.line_total || 0), 0);
    const totalPurchaseQty = items.reduce((sum: number, it: any) => sum + Number(it.qty || 0), 0);

    // 1. Delete previous landed costs for this purchase
    await (this.db as any)
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
      await (this.db as any).insertInto('purchase_landed_costs').values(costRows).execute();
    }

    // 3. Allocate across items
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
      await (this.db as any)
        .updateTable('purchase_items')
        .set({
          allocated_landed_cost: allocatedCost,
          landed_unit_cost: landedUnitCost,
        })
        .where('id', '=', item.id)
        .where(this.tenantPredicate(auth))
        .execute();

      // Update product cost in inventory
      if (item.product_id && landedUnitCost > 0) {
        await (this.db as any)
          .updateTable('products')
          .set({ cost_price: landedUnitCost })
          .where('id', '=', Number(item.product_id))
          .where(this.tenantPredicate(auth))
          .execute();
      }
    }

    // 4. Update purchase header
    await (this.db as any)
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

    return this.getPurchaseLandedCosts(purchaseId, auth);
  }
}
