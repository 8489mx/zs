/**
 * Weighted-average receipt cost. Inputs and result are per base stock unit, never per carton
 * or selected sales unit.
 *
 * Negative-stock policy (INV-NEGATIVE-STOCK-WAC): beforeQty may be negative. Overselling is a
 * supported setting (allowNegativeStockSales), so a receipt that follows overselling — a sale
 * return, a manufacturing completion, a trade-in, a maintenance return, a purchase receipt — is
 * legitimate, not an error. The previous strict throw blocked exactly those receipts. Sales and
 * consumptions expense at the then-current cost_price, so the algebraic blend
 * (beforeQty * beforeCost + receivedValue) / (beforeQty + receivedQty) preserves the book value
 * exactly through negative pools, for as long as the result stays non-negative.
 *
 * Two degenerate cases cannot be represented in a single-scalar WAC, so the function falls back
 * instead of ever storing a negative unit cost (which would corrupt every downstream COGS
 * computation):
 * - the receipt exactly empties the pool (|beforeQty + receivedQty| below 0.00001, the same
 *   dust threshold the purchase paths used; quantities live at 3dp, so anything below it is
 *   float noise): keep beforeCost. The stored cost is irrelevant to future blends
 *   (0 * cost == 0) and stays the last booked cost for any immediate short-sale. The residual
 *   between booked shortfall value and replacement value is not routed to a variance account
 *   here — same loss profile as the previous clamp / fallback behavior, strictly fewer cases;
 *   see the invariant for the follow-up.
 * - the algebraic result would be negative (replacement value cannot cover the booked shortfall
 *   value on a recovered pool, or exceeds it while still short — a price collapse or spike
 *   during a deep shortfall): fall back to the incoming unit cost on a recovered pool, and to
 *   beforeCost while still short.
 */
export function weightedReceiptCost(beforeQty: number, beforeCost: number, receivedQty: number, receivedValue: number): number {
  if (![beforeQty, beforeCost, receivedQty, receivedValue].every(Number.isFinite) || beforeCost < 0 || receivedQty <= 0 || receivedValue < 0) {
    throw new Error('Invalid inventory valuation inputs');
  }
  const afterQty = beforeQty + receivedQty;
  if (Math.abs(afterQty) < 0.00001) {
    return Number(beforeCost.toFixed(6));
  }
  const algebraic = Number(((beforeQty * beforeCost + receivedValue) / afterQty).toFixed(6));
  if (algebraic >= 0) {
    return algebraic;
  }
  return afterQty > 0 ? Number((receivedValue / receivedQty).toFixed(6)) : Number(beforeCost.toFixed(6));
}
