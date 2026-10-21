import { BadRequestException } from '@nestjs/common';

/** Allocate the full amount in integer cents; never lose or create a penny. */
export function allocateLandedCosts(totalAmount: number, weights: number[]): number[] {
  if (!Number.isFinite(totalAmount) || totalAmount < 0 || Math.abs(totalAmount * 100 - Math.round(totalAmount * 100)) > 0.000001) {
    throw new BadRequestException('قيمة التكاليف الإضافية يجب أن تكون موجبة وبمنزلتين عشريتين كحد أقصى.');
  }
  if (!weights.length || weights.some(weight => !Number.isFinite(weight) || weight < 0)) {
    throw new BadRequestException('أوزان توزيع التكاليف غير صالحة.');
  }
  const totalCents = Math.round(totalAmount * 100);
  if (!Number.isSafeInteger(totalCents)) throw new BadRequestException('قيمة التكاليف الإضافية غير صالحة.');
  const sumWeights = weights.reduce((sum, value) => sum + value, 0);
  const shares = weights.map((weight, index) => {
    const exact = sumWeights > 0 ? totalCents * weight / sumWeights : totalCents / weights.length;
    const whole = Math.floor(exact);
    return { index, whole, fractional: exact - whole };
  });
  const remainder = totalCents - shares.reduce((sum, s) => sum + s.whole, 0);
  if (remainder < 0 || remainder > shares.length) throw new BadRequestException('خطأ في تقريب توزيع التكاليف.');
  const ranked = [...shares].sort((a, b) => b.fractional - a.fractional || a.index - b.index);
  for (let i = 0; i < remainder; i++) ranked[i].whole += 1;
  return shares.map(share => share.whole / 100);
}
