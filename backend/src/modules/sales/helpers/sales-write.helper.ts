import { AppError } from '../../../common/errors/app-error';
import { NormalizedSalePayload } from '../dto/upsert-sale.dto';

function roundCurrency(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export type SaleProductOfferRow = {
  offer_type?: 'percent' | 'fixed' | 'price' | string | null;
  value?: number | string | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  min_qty?: number | string | null;
};

export type SaleProductRow = {
  id?: number | string | null;
  name?: string | null;
  stock_qty?: number | string | null;
  cost_price?: number | string | null;
  retail_price?: number | string | null;
  wholesale_price?: number | string | null;
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
  options: { allowNegativeStockSales?: boolean } = {},
): PreparedSaleItem {
  const productName = String(product.name || '').trim();
  const requiredQty = Number((Number(item.qty || 0) * Number(item.unitMultiplier || 1)).toFixed(3));
  const beforeQty = Number(product.stock_qty || 0);

  if (!options.allowNegativeStockSales && beforeQty < requiredQty) {
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

function normalizeDateOnly(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function isOfferActive(offer: SaleProductOfferRow, todayIso: string): boolean {
  const from = normalizeDateOnly(offer.start_date);
  const to = normalizeDateOnly(offer.end_date);
  return (!from || from <= todayIso) && (!to || to >= todayIso);
}

function calculateOfferAdjustedPrice(basePrice: number, offer: SaleProductOfferRow): number {
  const offerValue = Number(offer.value || 0);
  if (!(offerValue > 0) && offer.offer_type !== 'price') return roundCurrency(basePrice);
  if (offer.offer_type === 'percent') return roundCurrency(Math.max(0, basePrice - ((basePrice * offerValue) / 100)));
  if (offer.offer_type === 'fixed') return roundCurrency(Math.max(0, basePrice - offerValue));
  if (offer.offer_type === 'price') return roundCurrency(Math.max(0, offerValue));
  return roundCurrency(basePrice);
}

function pickBestApplicableOffer(offers: SaleProductOfferRow[], todayIso: string, qty: number, basePrice: number): SaleProductOfferRow | null {
  const normalizedQty = Math.max(1, Number(qty || 1));
  const applicableOffers = offers.filter((offer) => isOfferActive(offer, todayIso) && normalizedQty >= Math.max(1, Number(offer.min_qty || 1)));
  if (!applicableOffers.length) return null;

  return [...applicableOffers].sort((left, right) => {
    const leftMinQty = Math.max(1, Number(left.min_qty || 1));
    const rightMinQty = Math.max(1, Number(right.min_qty || 1));
    if (leftMinQty !== rightMinQty) return rightMinQty - leftMinQty;

    const leftPrice = calculateOfferAdjustedPrice(basePrice, left);
    const rightPrice = calculateOfferAdjustedPrice(basePrice, right);
    if (leftPrice !== rightPrice) return leftPrice - rightPrice;

    return Number(right.value || 0) - Number(left.value || 0);
  })[0] || null;
}

export function calculateAllowedSaleUnitPrice(params: {
  retailPrice?: number | string | null;
  wholesalePrice?: number | string | null;
  priceType: 'retail' | 'wholesale';
  offers?: SaleProductOfferRow[];
  qty?: number;
  todayIso?: string;
}): number {
  const basePrice = Number(params.priceType === 'wholesale' ? params.wholesalePrice || params.retailPrice || 0 : params.retailPrice || 0);
  const todayIso = normalizeDateOnly(params.todayIso) || new Date().toISOString().slice(0, 10);
  const activeOffer = pickBestApplicableOffer(params.offers || [], todayIso, Number(params.qty || 1), basePrice);

  if (!activeOffer) {
    return roundCurrency(basePrice);
  }

  return calculateOfferAdjustedPrice(basePrice, activeOffer);
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
