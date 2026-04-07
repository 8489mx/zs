export function computeInvoiceTotals(
  subtotal: number,
  discount: number,
  taxRate: number,
  pricesIncludeTax: boolean,
): { taxAmount: number; total: number } {
  const safeSubtotal = Number(subtotal.toFixed(2));
  const safeDiscount = Number(Math.max(0, discount).toFixed(2));
  const taxableBase = Math.max(0, safeSubtotal - safeDiscount);
  const rate = Math.max(0, Number(taxRate || 0));

  if (pricesIncludeTax) {
    const total = Number(taxableBase.toFixed(2));
    const taxAmount = Number((total - total / (1 + rate / 100)).toFixed(2));
    return { taxAmount, total };
  }

  const taxAmount = Number((taxableBase * (rate / 100)).toFixed(2));
  return { taxAmount, total: Number((taxableBase + taxAmount).toFixed(2)) };
}
