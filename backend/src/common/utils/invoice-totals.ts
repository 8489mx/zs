export function computeInvoiceTotals(
  subtotal: number,
  discount: number,
  taxRate: number,
  pricesIncludeTax: boolean,
  deliveryFee: number = 0,
): { taxAmount: number; total: number } {
  const safeSubtotal = Number(subtotal.toFixed(2));
  const safeDiscount = Number(Math.max(0, discount).toFixed(2));
  const safeDeliveryFee = Number(Math.max(0, deliveryFee).toFixed(2));
  const taxableBase = Math.max(0, safeSubtotal - safeDiscount);
  const rate = Math.max(0, Number(taxRate || 0));

  if (pricesIncludeTax) {
    const total = Number((taxableBase + safeDeliveryFee).toFixed(2));
    const taxAmount = Number((taxableBase - taxableBase / (1 + rate / 100)).toFixed(2));
    return { taxAmount, total };
  }

  const taxAmount = Number((taxableBase * (rate / 100)).toFixed(2));
  return { taxAmount, total: Number((taxableBase + taxAmount + safeDeliveryFee).toFixed(2)) };
}
