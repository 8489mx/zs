function parseReturnPayload(payload) {
  const returnType = payload.type === 'purchase' ? 'purchase' : 'sale';
  const invoiceId = Number(payload.invoiceId || 0);
  const note = String(payload.note || '').trim();
  const settlementMode = payload.settlementMode === 'store_credit' ? 'store_credit' : 'refund';
  const refundMethod = payload.refundMethod === 'card' ? 'card' : 'cash';

  if (payload.settlementMode === 'exchange' || payload.exchangeSaleId) throw new Error('Exchange flow is not supported');
  if (invoiceId <= 0) throw new Error('Invoice is required');
  if (note.length < 8) throw new Error('Return note must be at least 8 characters');
  if (settlementMode !== 'refund' && refundMethod !== 'cash') throw new Error('Refund method is only allowed for refund settlements');

  const rawItems = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : [{ productId: payload.productId, qty: payload.qty, productName: payload.productName }];
  const normalizedItems = rawItems
    .map((entry) => ({
      productId: Number((entry && entry.productId) || 0),
      qty: Number((entry && entry.qty) || 0),
      productName: String((entry && entry.productName) || '').trim(),
    }))
    .filter((entry) => entry.productId > 0 && entry.qty > 0);

  if (!normalizedItems.length) throw new Error('At least one return item is required');
  const seenProductIds = new Set();
  for (const entry of normalizedItems) {
    if (seenProductIds.has(entry.productId)) throw new Error('Duplicate products are not allowed in the same return');
    seenProductIds.add(entry.productId);
  }

  return {
    returnType,
    invoiceId,
    note,
    settlementMode,
    refundMethod,
    normalizedItems,
  };
}

module.exports = { parseReturnPayload };
