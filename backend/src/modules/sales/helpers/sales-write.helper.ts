import { AppError } from '../../../common/errors/app-error';
import { NormalizedSalePayload } from '../dto/upsert-sale.dto';

function roundCurrency(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export type SaleProductRow = {
  id?: number | string | null;
  name?: string | null;
  stock_qty?: number | string | null;
  cost_price?: number | string | null;
};

export type PreparedSaleItem = {
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  unitName: string;
  unitMultiplier: number;
  priceType: 'retail' | 'wholesale';
  costPrice: number;
  requiredQty: number;
  beforeQty: number;
  afterQty: number;
};

export function buildPreparedSaleItem(
  product: SaleProductRow,
  item: NormalizedSalePayload['items'][number],
): PreparedSaleItem {
  const productName = String(product.name || '').trim();
  const requiredQty = Number((Number(item.qty || 0) * Number(item.unitMultiplier || 1)).toFixed(3));
  const beforeQty = Number(product.stock_qty || 0);

  if (beforeQty < requiredQty) {
    throw new AppError(`Insufficient stock for ${productName || `#${item.productId}`}`, 'INSUFFICIENT_STOCK', 400);
  }

  const lineTotal = roundCurrency(Number(item.qty || 0) * Number(item.price || 0));
  return {
    productId: Number(product.id || item.productId),
    productName,
    qty: Number(item.qty || 0),
    unitPrice: Number(item.price || 0),
    lineTotal,
    unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
    unitMultiplier: Number(item.unitMultiplier || 1) || 1,
    priceType: item.priceType === 'wholesale' ? 'wholesale' : 'retail',
    costPrice: roundCurrency(Number(product.cost_price || 0) * Number(item.unitMultiplier || 1)),
    requiredQty,
    beforeQty,
    afterQty: Number((beforeQty - requiredQty).toFixed(3)),
  };
}

export function calculateCollectibleTotal(total: number, storeCreditUsed: number): number {
  return roundCurrency(Math.max(0, Number(total || 0) - Number(storeCreditUsed || 0)));
}

export function resolveSalePayments(
  paymentType: 'cash' | 'credit',
  payments: NormalizedSalePayload['payments'],
  collectibleTotal: number,
): Array<{ paymentChannel: 'cash' | 'card'; amount: number }> {
  if (paymentType === 'credit') return [];
  if (payments.length) return payments;
  if (collectibleTotal > 0) return [{ paymentChannel: 'cash', amount: collectibleTotal }];
  return [];
}

export function calculatePaidAmount(payments: Array<{ amount: number }>): number {
  return roundCurrency(payments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
}

export function resolvePostedSalePaymentChannel(
  paymentType: 'cash' | 'credit',
  payments: Array<{ paymentChannel: 'cash' | 'card' }>,
): 'cash' | 'card' | 'mixed' | 'credit' {
  if (paymentType === 'credit') return 'credit';
  if (payments.length > 1) return 'mixed';
  return payments[0]?.paymentChannel || 'cash';
}

export function calculateRestoredStockQuantity(currentStockQty: number | string | null | undefined, itemQty: number | string | null | undefined, unitMultiplier: number | string | null | undefined) {
  const restoreQty = Number((Number(itemQty || 0) * Number(unitMultiplier || 1)).toFixed(3));
  const beforeQty = Number(currentStockQty || 0);
  const afterQty = Number((beforeQty + restoreQty).toFixed(3));
  return { restoreQty, beforeQty, afterQty };
}
