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
  originalPrice?: number;
  offerDiscount?: number;
  offerName?: string;
  lineTotal: number;
  unitName: string;
  unitMultiplier: number;
  priceType: 'retail' | 'wholesale';
  costPrice: number;
  requiredQty: number;
  beforeQty: number;
  afterQty: number;
  notes: string;
  modifiers: unknown;
  isService?: boolean;
  serials?: any;
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

  const modifiersTotal = (item.modifiers || []).reduce((sum: number, mod: any) => sum + (Number(mod.price || 0) * Number(mod.qty || 1)), 0);
  const lineTotal = roundCurrency(Number(item.qty || 0) * (Number(item.price || 0) + modifiersTotal));
  const modifiersCostTotal = (item.modifiers || []).reduce((sum: number, mod: any) => sum + (Number(mod.costPrice || 0) * Number(mod.qty || 1)), 0);

  return {
    productId: Number(product.id || item.productId),
    productName,
    qty: Number(item.qty || 0),
    unitPrice: Number(item.price || 0),
    ...(item.originalPrice !== undefined ? { originalPrice: Number(item.originalPrice) } : {}),
    ...(item.offerDiscount !== undefined ? { offerDiscount: Number(item.offerDiscount) } : {}),
    ...(item.offerName !== undefined ? { offerName: item.offerName } : {}),
    lineTotal,
    unitName: String(item.unitName || 'قطعة').trim() || 'قطعة',
    unitMultiplier: Number(item.unitMultiplier || 1) || 1,
    priceType: item.priceType === 'wholesale' ? 'wholesale' : 'retail',
    // Stored as cost per sold unit on sale_items (not per base piece) so accounting COGS can use qty * cost_price.
    costPrice: roundCurrency((Number(product.cost_price || 0) * Number(item.unitMultiplier || 1)) + modifiersCostTotal),
    requiredQty,
    beforeQty,
    afterQty: Number((beforeQty - requiredQty).toFixed(3)),
    notes: item.notes || '',
    modifiers: item.modifiers,
    isService: (product as any)?.item_type === 'service',
    ...(item.serials !== undefined ? { serials: item.serials } : {}),
  };
}

export function calculateCollectibleTotal(total: number, storeCreditUsed: number): number {
  return roundCurrency(Number(total || 0) - Number(storeCreditUsed || 0));
}

function normalizeDateOnly(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

function todayLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOfferActive(offer: SaleProductOfferRow, todayIso: string): boolean {
  const from = normalizeDateOnly(offer.start_date);
  const to = normalizeDateOnly(offer.end_date);
  return (!from || from <= todayIso) && (!to || to >= todayIso);
}

function calculateOfferAdjustedPrice(basePrice: number, offer: SaleProductOfferRow, qty: number = 1): number {
  const offerValue = Number(offer.value || 0);
  if (!(offerValue > 0) && offer.offer_type !== 'price' && offer.offer_type !== 'bundle') return roundCurrency(basePrice);
  if (offer.offer_type === 'percent') return roundCurrency(Math.max(0, basePrice - ((basePrice * offerValue) / 100)));
  if (offer.offer_type === 'fixed') return roundCurrency(Math.max(0, basePrice - offerValue));
  if (offer.offer_type === 'price') return roundCurrency(Math.max(0, offerValue));
  if (offer.offer_type === 'bundle') {
    const minQty = Math.max(1, Number(offer.min_qty || 1));
    const normalizedQty = Math.max(1, Number(qty || 1));
    if (normalizedQty < minQty) return roundCurrency(basePrice);
    const bundles = Math.floor(normalizedQty / minQty);
    const remainder = normalizedQty % minQty;
    const total = (bundles * offerValue) + (remainder * basePrice);
    return roundCurrency(total / normalizedQty);
  }
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

    const leftPrice = calculateOfferAdjustedPrice(basePrice, left, normalizedQty);
    const rightPrice = calculateOfferAdjustedPrice(basePrice, right, normalizedQty);
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
  unitMultiplier?: number;
  todayIso?: string;
}): number {
  const multiplier = Number(params.unitMultiplier || 1) > 0 ? Number(params.unitMultiplier || 1) : 1;
  if (params.priceType === 'wholesale') {
    return roundCurrency(Number(params.wholesalePrice || params.retailPrice || 0) * multiplier);
  }
  const basePrice = roundCurrency(Number(params.retailPrice || 0) * multiplier);
  const todayIso = normalizeDateOnly(params.todayIso) || todayLocalIsoDate();
  const qty = Number(params.qty || 1);
  const activeOffer = pickBestApplicableOffer(params.offers || [], todayIso, qty, basePrice);

  if (!activeOffer) {
    return roundCurrency(basePrice);
  }

  return calculateOfferAdjustedPrice(basePrice, activeOffer, qty);
}

export function resolveSalePayments(
  paymentType: 'cash' | 'credit',
  payments: NormalizedSalePayload['payments'],
  collectibleTotal: number,
  fallbackPaymentChannel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit' = 'cash',
): Array<{ paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay'; amount: number }> {
  let validPayments = payments;
  if (!validPayments.length && collectibleTotal > 0 && paymentType !== 'credit') {
    validPayments = [{
      paymentChannel: fallbackPaymentChannel === 'card'
        ? 'card'
        : fallbackPaymentChannel === 'wallet'
          ? 'wallet'
          : fallbackPaymentChannel === 'instapay'
            ? 'instapay'
            : 'cash',
      amount: collectibleTotal,
    }];
  }

  const result: Array<{ paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay'; amount: number }> = [];
  let remainingTotal = collectibleTotal;

  // Process non-cash first
  for (const p of validPayments.filter(p => p.paymentChannel !== 'cash')) {
    const amountToApply = Math.min(Number(p.amount || 0), remainingTotal);
    if (amountToApply > 0) {
      result.push({ paymentChannel: p.paymentChannel, amount: roundCurrency(amountToApply) });
      remainingTotal -= amountToApply;
    }
  }

  // Process cash
  for (const p of validPayments.filter(p => p.paymentChannel === 'cash')) {
    if (remainingTotal <= 0) break;
    const amountToApply = Math.min(Number(p.amount || 0), remainingTotal);
    if (amountToApply > 0) {
      result.push({ paymentChannel: p.paymentChannel, amount: roundCurrency(amountToApply) });
      remainingTotal -= amountToApply;
    }
  }

  return result;
}

export function calculatePaidAmount(payments: Array<{ amount: number }>): number {
  return roundCurrency(payments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
}

export function resolvePostedSalePaymentChannel(
  paymentType: 'cash' | 'credit',
  payments: Array<{ paymentChannel: 'cash' | 'card' | 'wallet' | 'instapay' }>,
): 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit' {
  if (paymentType === 'credit') {
    if (payments.length === 0) return 'credit';
    if (payments.length > 1) return 'mixed';
    return payments[0]?.paymentChannel || 'credit';
  }
  if (payments.length > 1) return 'mixed';
  return payments[0]?.paymentChannel || 'cash';
}

export function calculateRestoredStockQuantity(currentStockQty: number | string | null | undefined, itemQty: number | string | null | undefined, unitMultiplier: number | string | null | undefined) {
  const restoreQty = Number((Number(itemQty || 0) * Number(unitMultiplier || 1)).toFixed(3));
  const beforeQty = Number(currentStockQty || 0);
  const afterQty = Number((beforeQty + restoreQty).toFixed(3));
  return { restoreQty, beforeQty, afterQty };
}
