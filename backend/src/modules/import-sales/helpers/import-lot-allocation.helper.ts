import { Kysely, Transaction, sql } from 'kysely';
import { Database } from '../../../database/database.types';

/**
 * IMPORT LOT ALLOCATION & PROVENANCE ENGINE
 *
 * Provides operational lot traceability between sales (POS, Wholesale),
 * sales returns, cancellations, and inventory movements:
 * - Allocates sales from active container lots using FIFO.
 * - Restores lot balances upon sale cancellation or returns.
 * - Tracks exact landed costs, invoiced sales, and gross margins per project and shipment.
 * - Preserves General Ledger Weighted Average Cost (WAC) intact.
 */

export async function allocateSaleFromImportLots(
  trx: Kysely<Database> | Transaction<Database>,
  params: {
    tenantId: string;
    saleId: number;
    items: Array<{
      itemId?: number | null;
      productId: number;
      qty: number;
      netUnitPrice: number;
    }>;
  }
): Promise<void> {
  for (const item of params.items) {
    const pId = Number(item.productId);
    let neededQty = Number(item.qty);
    if (!Number.isFinite(neededQty) || neededQty <= 0) continue;

    // Check if any active import lots exist for this product and tenant
    const lots = await trx
      .selectFrom('import_inventory_lots')
      .selectAll()
      .where('tenant_id', '=', params.tenantId)
      .where('product_id', '=', pId)
      .where('status', '=', 'active')
      .where('remaining_quantity', '>', 0)
      .orderBy('receipt_date', 'asc')
      .orderBy('created_at', 'asc')
      .forUpdate()
      .execute();

    if (!lots || lots.length === 0) continue;

    for (const lot of lots) {
      if (neededQty <= 0.0001) break;

      const avail = Number(lot.remaining_quantity);
      const allocQty = Math.min(avail, neededQty);
      const newRemaining = Number((avail - allocQty).toFixed(4));

      await trx
        .updateTable('import_inventory_lots')
        .set({
          remaining_quantity: newRemaining,
          status: newRemaining <= 0.0001 ? 'depleted' : 'active',
          updated_at: new Date(),
        })
        .where('id', '=', lot.id)
        .where('tenant_id', '=', params.tenantId)
        .execute();

      const unitSalePrice = Number(item.netUnitPrice);
      const unitCost = Number(lot.unit_landed_cost_egp);
      const grossMargin = Number(((unitSalePrice - unitCost) * allocQty).toFixed(2));

      await trx
        .insertInto('import_sale_allocations')
        .values({
          tenant_id: params.tenantId,
          sale_id: params.saleId,
          sale_item_id: item.itemId || null,
          lot_id: lot.id,
          project_id: lot.project_id || null,
          shipment_id: lot.shipment_id || null,
          product_id: pId,
          quantity: allocQty,
          unit_sale_price_egp: unitSalePrice,
          unit_cost_egp: unitCost,
          gross_margin_egp: grossMargin,
          allocation_type: 'sale',
          reversal_of_allocation_id: null,
          created_at: new Date(),
        } as any)
        .execute();

      neededQty = Number((neededQty - allocQty).toFixed(4));
    }
  }
}

export async function restoreImportLotsFromCancelledSale(
  trx: Kysely<Database> | Transaction<Database>,
  params: {
    tenantId: string;
    saleId: number;
  }
): Promise<void> {
  const allocations = await trx
    .selectFrom('import_sale_allocations')
    .selectAll()
    .where('tenant_id', '=', params.tenantId)
    .where('sale_id', '=', params.saleId)
    .where('allocation_type', '=', 'sale')
    .forUpdate()
    .execute();

  for (const alloc of allocations) {
    const qtyToRestore = Number(alloc.quantity);
    if (qtyToRestore <= 0) continue;

    await trx
      .updateTable('import_inventory_lots')
      .set((eb) => ({
        remaining_quantity: sql`${eb.ref('remaining_quantity')} + ${qtyToRestore}`,
        status: 'active',
        updated_at: new Date(),
      }))
      .where('id', '=', alloc.lot_id)
      .where('tenant_id', '=', params.tenantId)
      .execute();

    await trx
      .insertInto('import_sale_allocations')
      .values({
        tenant_id: params.tenantId,
        sale_id: params.saleId,
        sale_item_id: alloc.sale_item_id,
        lot_id: alloc.lot_id,
        project_id: alloc.project_id,
        shipment_id: alloc.shipment_id,
        product_id: alloc.product_id,
        quantity: -qtyToRestore,
        unit_sale_price_egp: Number(alloc.unit_sale_price_egp),
        unit_cost_egp: Number(alloc.unit_cost_egp),
        gross_margin_egp: -Number(alloc.gross_margin_egp),
        allocation_type: 'cancellation',
        reversal_of_allocation_id: alloc.id,
        created_at: new Date(),
      } as any)
      .execute();
  }
}

export async function restoreImportLotsFromSalesReturn(
  trx: Kysely<Database> | Transaction<Database>,
  params: {
    tenantId: string;
    saleId: number;
    saleItemId?: number | null;
    productId: number;
    returnQty: number;
  }
): Promise<void> {
  let remainingReturnQty = Number(params.returnQty);
  if (!Number.isFinite(remainingReturnQty) || remainingReturnQty <= 0) return;

  let query = trx
    .selectFrom('import_sale_allocations')
    .selectAll()
    .where('tenant_id', '=', params.tenantId)
    .where('sale_id', '=', params.saleId)
    .where('product_id', '=', params.productId)
    .where('allocation_type', '=', 'sale');

  if (params.saleItemId) {
    query = query.where('sale_item_id', '=', params.saleItemId);
  }

  const allocations = await query.orderBy('created_at', 'desc').forUpdate().execute();

  for (const alloc of allocations) {
    if (remainingReturnQty <= 0.0001) break;

    const allocQty = Number(alloc.quantity);
    const restoreAmount = Math.min(allocQty, remainingReturnQty);

    await trx
      .updateTable('import_inventory_lots')
      .set((eb) => ({
        remaining_quantity: sql`${eb.ref('remaining_quantity')} + ${restoreAmount}`,
        status: 'active',
        updated_at: new Date(),
      }))
      .where('id', '=', alloc.lot_id)
      .where('tenant_id', '=', params.tenantId)
      .execute();

    const unitSalePrice = Number(alloc.unit_sale_price_egp);
    const unitCost = Number(alloc.unit_cost_egp);
    const grossMarginReversed = Number(((unitSalePrice - unitCost) * restoreAmount).toFixed(2));

    await trx
      .insertInto('import_sale_allocations')
      .values({
        tenant_id: params.tenantId,
        sale_id: params.saleId,
        sale_item_id: alloc.sale_item_id,
        lot_id: alloc.lot_id,
        project_id: alloc.project_id,
        shipment_id: alloc.shipment_id,
        product_id: params.productId,
        quantity: -restoreAmount,
        unit_sale_price_egp: unitSalePrice,
        unit_cost_egp: unitCost,
        gross_margin_egp: -grossMarginReversed,
        allocation_type: 'return',
        reversal_of_allocation_id: alloc.id,
        created_at: new Date(),
      } as any)
      .execute();

    remainingReturnQty = Number((remainingReturnQty - restoreAmount).toFixed(4));
  }
}
