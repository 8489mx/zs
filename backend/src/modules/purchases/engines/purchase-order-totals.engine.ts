import { BadRequestException } from '@nestjs/common';

export type PurchaseOrderLineInput = {
  quantity: number;
  unitCost: number;
  taxRate?: number | null;
};

const cents = (value: number) => Math.round(value * 100);
const toMoney = (value: number) => cents(value) / 100;

/**
 * Trusted value for purchasing approvals and downstream GRN/bill conversion.
 * Client-supplied subtotal, tax and grand total are NEVER approval inputs.
 */
export function calculatePurchaseOrderTotals(
  items: PurchaseOrderLineInput[],
  discountAmount: number | null | undefined,
): { subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number; lineTotals: number[] } {
  if (!Array.isArray(items) || !items.length) throw new BadRequestException('أمر الشراء يحتاج بنداً واحداً على الأقل.');
  const lineTotals = items.map((item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitCost);
    const tax = Number(item.taxRate || 0);
    if (!Number.isFinite(qty) || qty <= 0 ||
        !Number.isFinite(price) || price < 0 ||
        !Number.isFinite(tax) || tax < 0 || tax > 100 ||
        !Number.isSafeInteger(cents(qty * price)) ||
        !Number.isSafeInteger(cents(qty * price * tax / 100))) {
      throw new BadRequestException('كمية أو سعر أو نسبة ضريبة غير صالحة في أمر الشراء.');
    }
    return toMoney(qty * price);
  });
  const subtotal = toMoney(lineTotals.reduce((sum, amount) => sum + amount, 0));
  const discount = Number(discountAmount ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || cents(discount) > cents(subtotal) ||
      Math.abs(discount * 100 - cents(discount)) > 0.000001) {
    throw new BadRequestException('خصم أمر الشراء غير صالح أو يتجاوز قيمة البنود.');
  }
  const normalizedDiscount = toMoney(discount);
  const effectiveSubtotal = Math.max(0, subtotal - normalizedDiscount);
  const unDiscountedTax = items.reduce((sum, item, index) =>
    sum + lineTotals[index] * Number(item.taxRate || 0) / 100, 0);
  const taxAmount = toMoney(subtotal > 0 ? unDiscountedTax * effectiveSubtotal / subtotal : 0);
  const totalAmount = toMoney(effectiveSubtotal + taxAmount);
  return { subtotal, taxAmount, discountAmount: normalizedDiscount, totalAmount, lineTotals };
}
