/** Inputs and result are per base stock unit, never per carton or selected sales unit. */
export function weightedReceiptCost(beforeQty: number, beforeCost: number, receivedQty: number, receivedValue: number): number {
  if (![beforeQty, beforeCost, receivedQty, receivedValue].every(Number.isFinite) || beforeQty < 0 || beforeCost < 0 || receivedQty <= 0 || receivedValue < 0) {
    throw new Error('Invalid inventory valuation; reconcile negative stock before receiving at a different cost');
  }
  return Number(((beforeQty * beforeCost + receivedValue) / (beforeQty + receivedQty)).toFixed(6));
}
