import { Kysely } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { recoverWacBeforeQty, revalueStockPool, weightedReceiptCost } from './engines/inventory-valuation.engine';

/** Called after applyStockDelta, while its product row lock is still held. */
export async function valueStockReceipt(db: Kysely<Database>, tenantId: string, productId: number, afterQty: number, qty: number, value: number): Promise<void> {
  const product = await db.selectFrom('products').select('cost_price').where('tenant_id', '=', tenantId).where('id', '=', productId).executeTakeFirstOrThrow();
  // applyStockDelta can reconcile a stale cached total. Its corrected globalAfter
  // is authoritative; subtract this receipt to recover the true prior quantity.
  const beforeQty = recoverWacBeforeQty(afterQty, qty);
  const cost = weightedReceiptCost(beforeQty, Number(product.cost_price), qty, value);
  await db.updateTable('products').set({ cost_price: cost }).where('tenant_id', '=', tenantId).where('id', '=', productId).execute();
}

/**
 * Revalue the stock already on hand by spreading an additional value
 * over it (INV-STOCK-POOL-REVALUATION). Called while the product row
 * lock is still held. Unlike valueStockReceipt this writer stamps
 * updated_at: both revaluation callers stamped it before, and the
 * revaluation is a deliberate repricing event, not a receipt.
 * beforeQty is caller-supplied — each caller keeps its own quantity
 * policy (cached counter for landed costs, company-wide on-hand for
 * late shipment expenses) — and must be positive.
 */
export async function revalueStockCost(db: Kysely<Database>, tenantId: string, productId: number, beforeQty: number, additionalValue: number): Promise<void> {
  const product = await db.selectFrom('products').select('cost_price').where('tenant_id', '=', tenantId).where('id', '=', productId).executeTakeFirstOrThrow();
  const cost = revalueStockPool(beforeQty, Number(product.cost_price), additionalValue);
  await db.updateTable('products').set({ cost_price: cost, updated_at: new Date() }).where('tenant_id', '=', tenantId).where('id', '=', productId).execute();
}
