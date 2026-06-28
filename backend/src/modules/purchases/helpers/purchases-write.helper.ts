import { AppError } from '../../../common/errors/app-error';
import { UpsertPurchaseDto } from '../dto/upsert-purchase.dto';

function roundCurrency(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export type PurchaseProductRow = {
  id?: number | string | null;
  name?: string | null;
  stock_qty?: number | string | null;
};

export type NormalizedPurchaseItem = {
  productId: number;
  name: string;
  qty: number;
  cost: number;
  oldCostPrice: number;
  unitName: string;
  unitMultiplier: number;
  total: number;
};

export type DiscountAllocatedPurchaseItem = NormalizedPurchaseItem & {
  allocatedDiscount: number;
  effectiveLineTotal: number;
  effectiveUnitCost: number;
};

export type PurchaseContextShape = {
  doc_no?: string | null;
  id?: number | string | null;
  branch_id?: number | null;
  location_id?: number | null;
  total?: number | string | null;
  supplier_id?: number | string | null;
  discount?: number | string | null;
};

export type PurchaseScope = {
  branchId: number | null;
  locationId: number | null;
};

export function buildNormalizedPurchaseItem(
  item: UpsertPurchaseDto['items'][number],
  product: PurchaseProductRow,
): NormalizedPurchaseItem {
  const productName = String(item.name || product.name || '').trim();
  if (!productName) {
    throw new AppError(`Product #${item.productId} is missing a display name`, 'PRODUCT_NAME_REQUIRED', 400);
  }

  const qty = Number(item.qty || 0);
  const cost = Number(item.cost || 0);
  const unitMultiplier = Number(item.unitMultiplier || 1) || 1;

  return {
    productId: Number(item.productId || product.id || 0),
    name: productName,
    qty,
    cost,
    oldCostPrice: Number((product as any).cost_price || 0),
    unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
    unitMultiplier,
    total: roundCurrency(qty * cost),
  };
}

export function calculatePurchaseSubtotal(items: Array<{ total: number }>): number {
  return roundCurrency(items.reduce((sum, item) => sum + Number(item.total || 0), 0));
}

export function allocatePurchaseInvoiceDiscount(items: NormalizedPurchaseItem[], invoiceDiscount: number): DiscountAllocatedPurchaseItem[] {
  const safeDiscount = roundCurrency(Number(invoiceDiscount || 0));
  if (!items.length || safeDiscount === 0) {
    return items.map((item) => ({
      ...item,
      allocatedDiscount: 0,
      effectiveLineTotal: roundCurrency(item.total),
      effectiveUnitCost: item.qty > 0 ? Number((roundCurrency(item.total) / item.qty).toFixed(6)) : 0,
    }));
  }

  const subtotal = roundCurrency(calculatePurchaseSubtotal(items));
  if (subtotal <= 0) {
    return items.map((item) => ({
      ...item,
      allocatedDiscount: 0,
      effectiveLineTotal: roundCurrency(item.total),
      effectiveUnitCost: item.qty > 0 ? Number((roundCurrency(item.total) / item.qty).toFixed(6)) : 0,
    }));
  }

  const eligibleIndexes = items
    .map((item, index) => ({ index, total: roundCurrency(item.total) }))
    .filter((entry) => entry.total > 0)
    .map((entry) => entry.index);

  if (!eligibleIndexes.length) {
    return items.map((item) => ({
      ...item,
      allocatedDiscount: 0,
      effectiveLineTotal: roundCurrency(item.total),
      effectiveUnitCost: item.qty > 0 ? Number((roundCurrency(item.total) / item.qty).toFixed(6)) : 0,
    }));
  }

  const targetNetTotal = roundCurrency(subtotal - safeDiscount);
  const allocatedByIndex = new Map<number, number>();
  const effectiveByIndex = new Map<number, number>();
  let allocatedSoFar = 0;
  let effectiveSoFar = 0;

  for (let i = 0; i < eligibleIndexes.length; i += 1) {
    const index = eligibleIndexes[i];
    const item = items[index];
    const gross = roundCurrency(item.total);
    const isLastEligible = i === eligibleIndexes.length - 1;

    if (!isLastEligible) {
      const proportional = roundCurrency((safeDiscount * gross) / subtotal);
      // For positive discounts, cap at gross to prevent negative net line totals. For negative discounts (surcharge), no cap needed.
      const allocated = safeDiscount > 0 ? Math.min(proportional, gross) : proportional;
      const net = roundCurrency(gross - allocated);
      allocatedByIndex.set(index, allocated);
      effectiveByIndex.set(index, net);
      allocatedSoFar = roundCurrency(allocatedSoFar + allocated);
      effectiveSoFar = roundCurrency(effectiveSoFar + net);
      continue;
    }

    const allocated = roundCurrency(safeDiscount - allocatedSoFar);
    const adjustedAllocated = safeDiscount > 0 ? Math.min(allocated, gross) : allocated;
    const net = roundCurrency(gross - adjustedAllocated);
    
    allocatedByIndex.set(index, adjustedAllocated);
    effectiveByIndex.set(index, net);
    allocatedSoFar = roundCurrency(allocatedSoFar + adjustedAllocated);
  }

  return items.map((item, index) => {
    const gross = roundCurrency(item.total);
    const allocatedDiscount = roundCurrency(allocatedByIndex.get(index) || 0);
    const effectiveLineTotal = roundCurrency(
      effectiveByIndex.has(index)
        ? Number(effectiveByIndex.get(index) || 0)
        : gross,
    );
    return {
      ...item,
      allocatedDiscount,
      effectiveLineTotal,
      effectiveUnitCost: item.qty > 0 ? Number((effectiveLineTotal / item.qty).toFixed(6)) : 0,
    };
  });
}

export function calculatePurchaseStockIncrease(itemQty: number | string | null | undefined, unitMultiplier: number | string | null | undefined, currentStockQty: number | string | null | undefined) {
  const increasedQty = Number((Number(itemQty || 0) * Number(unitMultiplier || 1)).toFixed(3));
  const beforeQty = Number(currentStockQty || 0);
  const afterQty = Number((beforeQty + increasedQty).toFixed(3));
  return { increasedQty, beforeQty, afterQty };
}

export function calculatePurchaseStockDecrease(itemQty: number | string | null | undefined, unitMultiplier: number | string | null | undefined, currentStockQty: number | string | null | undefined) {
  const removedQty = Number((Number(itemQty || 0) * Number(unitMultiplier || 1)).toFixed(3));
  const beforeQty = Number(currentStockQty || 0);
  const afterQty = Number((beforeQty - removedQty).toFixed(3));
  return { removedQty, beforeQty, afterQty };
}

export function buildHistoricCostMap(oldItems: Array<{ product_id?: number | string | null; unit_cost?: number | string | null }>) {
  const oldByProduct = new Map<number, number>();
  for (const item of oldItems) {
    if (!item.product_id) continue;
    oldByProduct.set(Number(item.product_id), Number(item.unit_cost || 0));
  }
  return oldByProduct;
}

export function normalizePurchaseScope(payload: { branchId?: number | string | null; locationId?: number | string | null }): PurchaseScope {
  return {
    branchId: payload.branchId ? Number(payload.branchId) : null,
    locationId: payload.locationId ? Number(payload.locationId) : null,
  };
}

export function normalizeOptionalNote(note: unknown): string {
  return String(note || '').trim();
}

export function normalizePositiveAmount(amount: unknown, errorCode = 'INVALID_AMOUNT', message = 'Amount must be greater than zero'): number {
  const normalized = roundCurrency(Number(amount || 0));
  if (!(normalized > 0)) {
    throw new AppError(message, errorCode, 400);
  }
  return normalized;
}

export function ensureAmountWithinOutstanding(amount: number, outstanding: number, errorCode: string, message: string): void {
  if (!(outstanding > 0)) {
    throw new AppError(message, errorCode, 400);
  }
  if (amount > outstanding + 0.0001) {
    throw new AppError(message, errorCode, 400);
  }
}

export function resolvePurchaseDocumentNumber(purchase: PurchaseContextShape): string {
  return String(purchase.doc_no || purchase.id || '').trim();
}

export function buildPurchaseReferenceNote(prefix: string, purchase: PurchaseContextShape): string {
  return `${prefix} ${resolvePurchaseDocumentNumber(purchase)}`.trim();
}
