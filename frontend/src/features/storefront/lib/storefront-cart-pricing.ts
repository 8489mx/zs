import type { StorefrontProduct } from '../types/storefront.types';

export interface CartLinePricingResult {
  lineTotal: number;
  unitPrice: number;
  originalLineTotal: number;
  savings: number;
  isBogoApplied: boolean;
  offerBadge?: string;
}

/**
 * Calculates exact line pricing for a storefront product accounting for
 * BOGO volume thresholds, bundles, and active discounts.
 */
export function calculateCartLinePricing(
  product: StorefrontProduct,
  quantity: number = 1,
): CartLinePricingResult {
  const qty = Math.max(1, Math.trunc(Number(quantity) || 1));
  const basePrice = Number(product.originalPrice || product.price || 0);
  const originalLineTotal = Math.round(basePrice * qty * 100) / 100;

  // BOGO Offer
  if (product.offerType === 'bogo' && product.bogoBuyQty && product.bogoGetQty) {
    const buyQ = Math.max(1, Number(product.bogoBuyQty));
    const getQ = Math.max(1, Number(product.bogoGetQty));
    const discPct = Math.min(100, Math.max(0, Number(product.bogoDiscountPercent ?? 100)));
    const freeUnits = Math.floor(qty / (buyQ + getQ)) * getQ;

    if (freeUnits > 0) {
      const normalTotal = qty * basePrice;
      const savings = freeUnits * basePrice * (discPct / 100);
      const discountedTotal = Math.round(Math.max(0, normalTotal - savings) * 100) / 100;
      const unitPrice = Math.round((discountedTotal / qty) * 100) / 100;
      return {
        lineTotal: discountedTotal,
        unitPrice,
        originalLineTotal,
        savings: Math.round(savings * 100) / 100,
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
      const discountedTotal = Math.round(((bundles * product.offerValue) + (remainder * basePrice)) * 100) / 100;
      const unitPrice = Math.round((discountedTotal / qty) * 100) / 100;
      return {
        lineTotal: discountedTotal,
        unitPrice,
        originalLineTotal,
        savings: Math.max(0, Math.round((originalLineTotal - discountedTotal) * 100) / 100),
        isBogoApplied: false,
        offerBadge: product.offerBadge,
      };
    }
  }

  // Standard line with already discounted product.price
  const effectiveUnitPrice = Number(product.price || basePrice);
  const lineTotal = Math.round(effectiveUnitPrice * qty * 100) / 100;
  return {
    lineTotal,
    unitPrice: effectiveUnitPrice,
    originalLineTotal,
    savings: Math.max(0, Math.round((originalLineTotal - lineTotal) * 100) / 100),
    isBogoApplied: false,
    offerBadge: product.offerBadge,
  };
}

export function calculateCartSubtotal(items: Array<{ product: StorefrontProduct; quantity: number }>): {
  subtotal: number;
  originalSubtotal: number;
  totalSavings: number;
} {
  let subtotal = 0;
  let originalSubtotal = 0;

  for (const item of items) {
    const pricing = calculateCartLinePricing(item.product, item.quantity);
    subtotal += pricing.lineTotal;
    originalSubtotal += pricing.originalLineTotal;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  originalSubtotal = Math.round(originalSubtotal * 100) / 100;

  return {
    subtotal,
    originalSubtotal,
    totalSavings: Math.max(0, Math.round((originalSubtotal - subtotal) * 100) / 100),
  };
}
