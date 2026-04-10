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
  unitName: string;
  unitMultiplier: number;
  total: number;
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
    unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
    unitMultiplier,
    total: roundCurrency(qty * cost),
  };
}

export function calculatePurchaseSubtotal(items: Array<{ total: number }>): number {
  return roundCurrency(items.reduce((sum, item) => sum + Number(item.total || 0), 0));
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
