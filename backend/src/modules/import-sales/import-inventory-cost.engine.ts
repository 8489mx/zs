import { BadRequestException } from '@nestjs/common';
import { weightedReceiptCost } from '../accounting/engines/inventory-valuation.engine';

export interface ImportCostLine {
  id: string;
  productId: number;
  quantity: number;
  receivedQuantity: number;
  factoryUnitPriceUsd: number;
  shortageHandlingMethod: string;
}

export function requireImportNumber(value: unknown, label: string, min = 0): number {
  if (value === null || value === undefined || value === '' ||
      !Number.isFinite(Number(value)) || Number(value) < min) {
    throw new BadRequestException(`قيمة غير صالحة: ${label}`);
  }
  return Number(value);
}

export function validateImportLine(line: ImportCostLine): void {
  if (!Number.isSafeInteger(line.productId) || line.productId <= 0) {
    throw new BadRequestException('معرف الصنف غير صالح');
  }
  requireImportNumber(line.quantity, 'الكمية', 1);
  if (!Number.isInteger(line.quantity)) throw new BadRequestException('كمية البوليصة يجب أن تكون عددًا صحيحًا');
  requireImportNumber(line.receivedQuantity, 'الكمية المستلمة');
  if (line.receivedQuantity > line.quantity ||
      Math.abs(line.receivedQuantity - Number(line.receivedQuantity.toFixed(3))) > 1e-9) {
    throw new BadRequestException('الكمية المستلمة تتجاوز البوليصة أو دقة المخزون (3 منازل)');
  }
  requireImportNumber(line.factoryUnitPriceUsd, 'سعر المصنع');
  if (!['capitalize', 'expense'].includes(line.shortageHandlingMethod)) {
    throw new BadRequestException('طريقة معالجة النقص غير صالحة');
  }
}

/** Allocate once from source costs, never from previously allocated landed costs. */
export function calculateImportLandedCosts(
  lines: ImportCostLine[],
  costs: { exchangeRate: number; shippingUsd: number; customsEgp: number; transportEgp: number },
) {
  requireImportNumber(costs.exchangeRate, 'سعر الصرف', Number.MIN_VALUE);
  requireImportNumber(costs.shippingUsd, 'الشحن');
  requireImportNumber(costs.customsEgp, 'الجمارك');
  requireImportNumber(costs.transportEgp, 'النقل');
  lines.forEach(validateImportLine);
  const totalUsd = lines.reduce((sum, line) => sum + line.quantity * line.factoryUnitPriceUsd, 0);
  const overhead = costs.shippingUsd * costs.exchangeRate + costs.customsEgp + costs.transportEgp;
  requireImportNumber(totalUsd, 'إجمالي قيمة البوليصة');
  requireImportNumber(overhead, 'إجمالي المصاريف');
  return lines.map((line) => {
    const baseUsd = line.quantity * line.factoryUnitPriceUsd;
    const allocated = overhead * (totalUsd > 0 ? baseUsd / totalUsd : 1 / lines.length);
    const totalCost = baseUsd * costs.exchangeRate + allocated;
    if (line.shortageHandlingMethod === 'capitalize' && line.receivedQuantity === 0 && totalCost > 0) {
      throw new BadRequestException('لا يمكن رسملة تكلفة على كمية مستلمة صفرية؛ اختر معالجة النقص كمصروف');
    }
    const denominator = line.shortageHandlingMethod === 'capitalize'
      ? line.receivedQuantity : line.quantity;
    // Match the existing NUMERIC(10,2) line columns before posting their value.
    const landedCost = denominator > 0 ? Number((totalCost / denominator).toFixed(2)) : 0;
    requireImportNumber(landedCost, 'التكلفة المحملة');
    return {
      ...line,
      landedCost,
      allocatedOverhead: denominator > 0 ? Number((allocated / denominator).toFixed(2)) : 0,
    };
  });
}

export function groupImportReceipts(lines: Array<ImportCostLine & { landedCost: number }>) {
  const products = new Map<number, { productId: number; quantity: number; value: number; shortageExpense: number }>();
  for (const line of lines) {
    validateImportLine(line);
    requireImportNumber(line.landedCost, 'التكلفة المحملة');
    const group = products.get(line.productId) ?? {
      productId: line.productId, quantity: 0, value: 0, shortageExpense: 0,
    };
    group.quantity = Number((group.quantity + line.receivedQuantity).toFixed(3));
    group.value += line.receivedQuantity * line.landedCost;
    if (line.shortageHandlingMethod === 'expense') {
      group.shortageExpense += (line.quantity - line.receivedQuantity) * line.landedCost;
    }
    requireImportNumber(group.value, 'قيمة الاستلام');
    products.set(line.productId, group);
  }
  return [...products.values()].sort((a, b) => a.productId - b.productId);
}

/**
 * One WAC policy for every receipt path (INV-WAC-UNIFIED-BLEND): the import
 * receipt blends exactly like a purchase receipt, through the canonical
 * weightedReceiptCost — including its negative-stock policy (algebraic
 * blend with a non-negative guard, INV-NEGATIVE-STOCK-WAC). The old
 * formula took the incoming cost whenever the prior stock was zero or
 * negative, erasing the booked shortfall value and valuing the same
 * receipt differently from a purchase receipt of the same goods.
 *
 * Only the blend is delegated. The import-side validation and the
 * BadRequestException contract are preserved: a corrupt stored cost or
 * value still fails closed with the same Arabic 400 the import flow
 * has always raised. A zero-quantity group keeps the old cost
 * (weightedReceiptCost rejects zero receipts; the caller guards
 * quantity > 0, but an empty group still reaches this function).
 */
export function importWeightedAverageCost(oldQty: number, oldCost: number, quantity: number, value: number): number {
  if (!Number.isFinite(oldQty)) throw new BadRequestException('رصيد المخزون غير صالح');
  requireImportNumber(oldCost, 'التكلفة السابقة');
  requireImportNumber(quantity, 'الكمية المستلمة');
  requireImportNumber(value, 'قيمة الاستلام');
  if (quantity === 0) return oldCost;
  return weightedReceiptCost(oldQty, oldCost, quantity, value);
}
