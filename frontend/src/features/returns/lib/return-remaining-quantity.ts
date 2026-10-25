/** Unavailable invoice history is not equivalent to zero prior returns. */
export function remainingInvoiceLineQuantity(original: number, returned: number, ready: boolean, legacyBlocked: boolean): number {
  if (!ready || legacyBlocked || !Number.isFinite(original) || !Number.isFinite(returned)) return 0;
  return Math.max(0, Number((original - returned).toFixed(3)));
}
