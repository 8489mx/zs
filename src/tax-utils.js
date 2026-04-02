function computeInvoiceTotals({ subtotal = 0, discount = 0, taxRate = 0, pricesIncludeTax = false } = {}) {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  const safeDiscount = Math.max(0, Number(discount || 0));
  const safeTaxRate = Math.max(0, Number(taxRate || 0));
  const includesTax = Boolean(pricesIncludeTax);
  const netBeforeTax = Math.max(0, safeSubtotal - safeDiscount);
  const taxAmount = safeTaxRate > 0
    ? (includesTax ? (netBeforeTax * safeTaxRate / (100 + safeTaxRate)) : (netBeforeTax * safeTaxRate / 100))
    : 0;
  const total = includesTax ? netBeforeTax : (netBeforeTax + taxAmount);
  return {
    subtotal: Number(safeSubtotal.toFixed(2)),
    discount: Number(safeDiscount.toFixed(2)),
    taxRate: Number(safeTaxRate.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    pricesIncludeTax: includesTax,
    total: Number(total.toFixed(2)),
  };
}

module.exports = { computeInvoiceTotals };
