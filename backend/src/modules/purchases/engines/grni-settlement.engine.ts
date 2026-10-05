import { AppError } from '../../../common/errors/app-error';

export type GrnAccrualLine = { id: number; acceptedQty: number; unitCost: number };

function cents(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new AppError('قيمة تسوية الاستلام غير صالحة', 'GRNI_AMOUNT_INVALID', 422);
  }
  return result;
}

/** Reconcile line allocations to the exact total posted by the GRN journal. */
export function allocateGrnAccrual(lines: GrnAccrualLine[]): Map<number, number> {
  const sorted = [...lines].sort((a, b) => a.id - b.id);
  if (sorted.some((line) => !Number.isFinite(line.acceptedQty) || line.acceptedQty < 0 ||
    !Number.isFinite(line.unitCost) || line.unitCost < 0)) {
    throw new AppError('بنود الاستلام غير صالحة للتسوية', 'GRNI_LINE_INVALID', 422);
  }
  let remaining = cents(sorted.reduce((sum, line) => sum + line.acceptedQty * line.unitCost, 0));
  const result = new Map<number, number>();
  const lastBillableId = [...sorted].reverse().find((line) => line.acceptedQty > 0)?.id;
  sorted.forEach((line) => {
    const amount = line.acceptedQty <= 0 ? 0 : line.id === lastBillableId
      ? remaining : Math.min(remaining, cents(line.acceptedQty * line.unitCost));
    result.set(line.id, amount);
    remaining -= amount;
  });
  return result;
}

/** The last invoice for a receipt line absorbs all rounding residue. */
export function allocateGrniBillPortion(input: {
  lineAccrualCents: number;
  acceptedQty: number;
  previouslyBilledQty: number;
  previouslyClearedCents: number;
  newQty: number;
}): number {
  const { lineAccrualCents, acceptedQty, previouslyBilledQty, previouslyClearedCents, newQty } = input;
  if (!Number.isSafeInteger(lineAccrualCents) || lineAccrualCents < 0 ||
    !Number.isSafeInteger(previouslyClearedCents) || previouslyClearedCents < 0 ||
    !Number.isFinite(acceptedQty) || acceptedQty <= 0 ||
    !Number.isFinite(newQty) || newQty <= 0 ||
    previouslyBilledQty < 0 || previouslyBilledQty + newQty > acceptedQty + 0.000001 ||
    previouslyClearedCents > lineAccrualCents) {
    throw new AppError('الكمية المفوترة تتجاوز الكمية المستلمة', 'GRNI_OVERBILL', 422);
  }
  const cumulativeQty = previouslyBilledQty + newQty;
  const cumulativeCents = Math.abs(cumulativeQty - acceptedQty) < 0.000001
    ? lineAccrualCents : Math.round(lineAccrualCents * cumulativeQty / acceptedQty);
  const portion = cumulativeCents - previouslyClearedCents;
  if (portion < 0) throw new AppError('تسوية GRNI السابقة غير متطابقة', 'GRNI_RECONCILIATION_REQUIRED', 422);
  return portion;
}
