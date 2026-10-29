import { AppError } from '../../../common/errors/app-error';
import type { MoneyDigits } from '../../accounting/engines/money-minor-units.engine';

export type GrnAccrualLine = { id: number; acceptedQty: number; unitCost: number };

/**
 * Minor-unit conversion for DERIVED amounts (qty x unit cost). Such products
 * legitimately carry sub-minor precision and must be ROUNDED to the tenant's
 * minor units — exactly what the old hard-coded cents() did, but at the
 * tenant's precision instead of 2 digits. This is deliberately NOT the
 * strict toMinorUnits() from the money engine, which throws on sub-minor
 * inputs: a 3-decimal-qty receipt at a 6-decimal unit cost is a valid input
 * that must round, not corrupt data.
 */
function toMinorUnitsRounded(value: number, digits: MoneyDigits): number {
  const result = Math.round((value + Number.EPSILON) * 10 ** digits);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new AppError('قيمة تسوية الاستلام غير صالحة', 'GRNI_AMOUNT_INVALID', 422);
  }
  return result;
}

/** Reconcile line allocations to the exact total posted by the GRN journal, in minor units. */
export function allocateGrnAccrual(lines: GrnAccrualLine[], minorUnits: MoneyDigits): Map<number, number> {
  const sorted = [...lines].sort((a, b) => a.id - b.id);
  if (sorted.some((line) => !Number.isFinite(line.acceptedQty) || line.acceptedQty < 0 ||
    !Number.isFinite(line.unitCost) || line.unitCost < 0)) {
    throw new AppError('بنود الاستلام غير صالحة للتسوية', 'GRNI_LINE_INVALID', 422);
  }
  let remaining = toMinorUnitsRounded(sorted.reduce((sum, line) => sum + line.acceptedQty * line.unitCost, 0), minorUnits);
  const result = new Map<number, number>();
  const lastBillableId = [...sorted].reverse().find((line) => line.acceptedQty > 0)?.id;
  sorted.forEach((line) => {
    const amount = line.acceptedQty <= 0 ? 0 : line.id === lastBillableId
      ? remaining : Math.min(remaining, toMinorUnitsRounded(line.acceptedQty * line.unitCost, minorUnits));
    result.set(line.id, amount);
    remaining -= amount;
  });
  return result;
}

/** The last invoice for a receipt line absorbs all rounding residue. Amounts are minor units. */
export function allocateGrniBillPortion(input: {
  lineAccrualMinor: number;
  acceptedQty: number;
  previouslyBilledQty: number;
  previouslyClearedMinor: number;
  newQty: number;
}): number {
  const { lineAccrualMinor, acceptedQty, previouslyBilledQty, previouslyClearedMinor, newQty } = input;
  if (!Number.isSafeInteger(lineAccrualMinor) || lineAccrualMinor < 0 ||
    !Number.isSafeInteger(previouslyClearedMinor) || previouslyClearedMinor < 0 ||
    !Number.isFinite(acceptedQty) || acceptedQty <= 0 ||
    !Number.isFinite(newQty) || newQty <= 0 ||
    previouslyBilledQty < 0 || previouslyBilledQty + newQty > acceptedQty + 0.000001 ||
    previouslyClearedMinor > lineAccrualMinor) {
    throw new AppError('الكمية المفوترة تتجاوز الكمية المستلمة', 'GRNI_OVERBILL', 422);
  }
  const cumulativeQty = previouslyBilledQty + newQty;
  const cumulativeMinor = Math.abs(cumulativeQty - acceptedQty) < 0.000001
    ? lineAccrualMinor : Math.round(lineAccrualMinor * cumulativeQty / acceptedQty);
  const portion = cumulativeMinor - previouslyClearedMinor;
  if (portion < 0) throw new AppError('تسوية GRNI السابقة غير متطابقة', 'GRNI_RECONCILIATION_REQUIRED', 422);
  return portion;
}
