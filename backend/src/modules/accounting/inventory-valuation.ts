import { Kysely } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { weightedReceiptCost } from './engines/inventory-valuation.engine';

/** Called after applyStockDelta, while its product row lock is still held. */
export async function valueStockReceipt(db: Kysely<Database>, tenantId: string, productId: number, afterQty: number, qty: number, value: number): Promise<void> {
  const product = await db.selectFrom('products').select('cost_price').where('tenant_id', '=', tenantId).where('id', '=', productId).executeTakeFirstOrThrow();
  // applyStockDelta can reconcile a stale cached total. Its corrected globalAfter
  // is authoritative; subtract this receipt to recover the true prior quantity.
  const beforeQty = Number((afterQty - qty).toFixed(3));
  const cost = weightedReceiptCost(beforeQty, Number(product.cost_price), qty, value);
  await db.updateTable('products').set({ cost_price: cost }).where('tenant_id', '=', tenantId).where('id', '=', productId).execute();
}
