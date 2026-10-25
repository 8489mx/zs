/** Unavailable invoice history is not equivalent to zero prior returns. */
export function remainingInvoiceLineQuantity(original: number, returned: number, ready: boolean, legacyBlocked: boolean): number {
  if (!ready || legacyBlocked || !Number.isFinite(original) || !Number.isFinite(returned)) return 0;
  return Math.max(0, Number((original - returned).toFixed(3)));
}

/** Prevent a stale selection from bypassing an updated invoice return balance. */
export function isSelectedReturnQuantityValid(
  lineId: string, productId: string, originalQty: number, requestedQty: number,
  returnedByLine: Record<string, number>, blockedProductIds: string[], ready: boolean,
): boolean {
  if (!lineId || !Number.isSafeInteger(Number(lineId)) || Number(lineId) <= 0 ||
      !Number.isFinite(requestedQty) || requestedQty <= 0 ||
      Math.abs(requestedQty * 1000 - Math.round(requestedQty * 1000)) > 0.000001) return false;
  const returned = Number(returnedByLine[lineId] || 0);
  const available = remainingInvoiceLineQuantity(originalQty, returned, ready, blockedProductIds.includes(productId));
  return requestedQty <= available + 0.000001;
}
