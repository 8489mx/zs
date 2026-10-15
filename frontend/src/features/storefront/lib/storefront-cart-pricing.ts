import type { StorefrontProduct } from '../types/storefront.types';
import { isThreeDecimalCurrency, getGlobalSystemCurrency } from '@/lib/currencies';

export interface CartLinePricingResult {
  lineTotal: number;
  unitPrice: number;
  originalLineTotal: number;
  savings: number;
  isBogoApplied: boolean;
  offerBadge?: string;
}

function getCartRoundFactor(currencyCode?: string | null): number {
  return isThreeDecimalCurrency(currencyCode || getGlobalSystemCurrency()) ? 1000 : 100;
}

/**
 * Calculates exact line pricing for a storefront product accounting for
 * BOGO volume thresholds, bundles, and active discounts.
 */
export function calculateCartLinePricing(
  product: StorefrontProduct,
  quantity: number = 1,
  currencyCode?: string | null,
): CartLinePricingResult {
  const factor = getCartRoundFactor(currencyCode);
  const qty = Math.max(1, Math.trunc(Number(quantity) || 1));
  const basePrice = Number(product.originalPrice || product.price || 0);
  const originalLineTotal = Math.round(basePrice * qty * factor) / factor;

  // BOGO Offer
  if (product.offerType === 'bogo' && product.bogoBuyQty && product.bogoGetQty) {
    const buyQ = Math.max(1, Number(product.bogoBuyQty));
    const getQ = Math.max(1, Number(product.bogoGetQty));
    const discPct = Math.min(100, Math.max(0, Number(product.bogoDiscountPercent ?? 100)));
    const freeUnits = Math.floor(qty / (buyQ + getQ)) * getQ;

    if (freeUnits > 0) {
      const normalTotal = qty * basePrice;
      const savings = freeUnits * basePrice * (discPct / 100);
      const discountedTotal = Math.round(Math.max(0, normalTotal - savings) * factor) / factor;
      const unitPrice = Math.round((discountedTotal / qty) * factor) / factor;
      return {
        lineTotal: discountedTotal,
        unitPrice,
        originalLineTotal,
        savings: Math.round(savings * factor) / factor,
        isBogoApplied: true,
        offerBadge: discPct === 100 ? `اشتري ${buyQ} واكسب ${getQ}` : `اشتري ${buyQ} و${getQ} بخصم ${discPct}%`,
      };
    }
  }

  // Bundle / min_qty
  if (product.offerType === 'bundle' && product.minQty && product.offerValue) {
    const minQ = Math.max(1, Number(product.minQty));
    if (qty >= minQ) {
      const bundles = Math.floor(qty / minQ);
      const remainder = qty % minQ;
      const discountedTotal = Math.round(((bundles * product.offerValue) + (remainder * basePrice)) * factor) / factor;
      const unitPrice = Math.round((discountedTotal / qty) * factor) / factor;
      return {
        lineTotal: discountedTotal,
        unitPrice,
        originalLineTotal,
        savings: Math.max(0, Math.round((originalLineTotal - discountedTotal) * factor) / factor),
        isBogoApplied: false,
        offerBadge: product.offerBadge,
      };
    }
  }

  // Standard line with already discounted product.price
  const effectiveUnitPrice = Number(product.price || basePrice);
  const lineTotal = Math.round(effectiveUnitPrice * qty * factor) / factor;
  return {
    lineTotal,
    unitPrice: effectiveUnitPrice,
    originalLineTotal,
    savings: Math.max(0, Math.round((originalLineTotal - lineTotal) * factor) / factor),
    isBogoApplied: false,
    offerBadge: product.offerBadge,
  };
}

export function calculateCartSubtotal(
  items: Array<{ product: StorefrontProduct; quantity: number }>,
  currencyCode?: string | null,
): {
  subtotal: number;
  originalSubtotal: number;
  totalSavings: number;
} {
  const factor = getCartRoundFactor(currencyCode);
  let subtotal = 0;
  let originalSubtotal = 0;

  for (const item of items) {
    const pricing = calculateCartLinePricing(item.product, item.quantity, currencyCode);
    subtotal += pricing.lineTotal;
    originalSubtotal += pricing.originalLineTotal;
  }

  subtotal = Math.round(subtotal * factor) / factor;
  originalSubtotal = Math.round(originalSubtotal * factor) / factor;

  return {
    subtotal,
    originalSubtotal,
    totalSavings: Math.max(0, Math.round((originalSubtotal - subtotal) * factor) / factor),
  };
}
