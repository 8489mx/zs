import { AppError } from '../../../common/errors/app-error';

export type InvoiceDiscountLine = { lineTotal: number; qty: number };
export type AllocatedInvoiceLine = {
  allocatedDiscount: number;
  allocatedTax: number;
  netLineTotal: number;
  netUnitPrice: number;
};

function toCents(value: number): number {
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || Math.abs(Number(value) * 100 - cents) > 0.001) {
    throw new AppError('Invoice line amounts require cent precision', 'INVALID_INVOICE_ALLOCATION', 400);
  }
  return cents;
}

/** Allocates every cent of invoice discount and tax; the final line absorbs rounding. */
export function allocateInvoiceDiscount(input: {
  lines: InvoiceDiscountLine[];
  invoiceDiscount: number;
  invoiceTax: number;
  pricesIncludeTax: boolean;
}): AllocatedInvoiceLine[] {
  const lineCents = input.lines.map((line) => toCents(line.lineTotal));
  if (lineCents.length === 0) throw new AppError('Invoice requires a line', 'INVALID_INVOICE_ALLOCATION', 400);
  const subtotal = lineCents.reduce((sum, amount) => sum + amount, 0);
  const discount = toCents(input.invoiceDiscount);
  const tax = toCents(input.invoiceTax);
  if (discount > subtotal || (subtotal === 0 && (discount > 0 || tax > 0))) {
    throw new AppError('Invoice discount exceeds line subtotal', 'INVALID_INVOICE_ALLOCATION', 400);
  }
  if (input.lines.some((line) => !Number.isFinite(line.qty) || line.qty <= 0)) {
    throw new AppError('Invoice line quantity must be positive', 'INVALID_INVOICE_ALLOCATION', 400);
  }
  let discountRemaining = discount;
  let grossRemaining = subtotal;
  const discounted = lineCents.map((amount, index) => {
    grossRemaining -= amount;
    const proportional = subtotal > 0 ? Math.round(discount * amount / subtotal) : 0;
    const share = index === lineCents.length - 1 ? discountRemaining
      : Math.min(amount, discountRemaining, Math.max(proportional, discountRemaining - grossRemaining));
    discountRemaining -= share;
    return { gross: amount, discount: share, base: amount - share };
  });
  const taxableBase = discounted.reduce((sum, line) => sum + line.base, 0);
  if (tax > 0 && taxableBase <= 0) throw new AppError('Tax requires a taxable base', 'INVALID_INVOICE_ALLOCATION', 400);
  let taxRemaining = tax;
  let lastTaxableIndex = -1;
  discounted.forEach((line, index) => { if (line.base > 0) lastTaxableIndex = index; });
  return discounted.map((line, index) => {
    const taxShare = line.base <= 0 ? 0 : index === lastTaxableIndex ? taxRemaining
      : Math.min(taxRemaining, Math.round(tax * line.base / taxableBase));
    taxRemaining -= taxShare;
    const netCents = line.base - (input.pricesIncludeTax ? taxShare : 0);
    if (netCents < 0) throw new AppError('Allocated tax exceeds line value', 'INVALID_INVOICE_ALLOCATION', 400);
    return {
      allocatedDiscount: line.discount / 100,
      allocatedTax: taxShare / 100,
      netLineTotal: netCents / 100,
      netUnitPrice: Number((netCents / 100 / input.lines[index].qty).toFixed(6)),
    };
  });
}
