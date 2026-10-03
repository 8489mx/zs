/**
 * Storefront Offers & Promotions Calculation Engine
 * 
 * Invariant: All offer pricing calculations are strictly pure, deterministic,
 * and shared between catalog projection and checkout order validation.
 */

export interface RawStorefrontOffer {
  id?: number | string;
  product_id?: number | string;
  offer_type: 'percent' | 'fixed' | 'price' | 'bundle' | 'bogo' | string;
  value: number | string;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  min_qty?: number | string | null;
  is_active?: boolean | null;
  bogo_buy_qty?: number | string | null;
  bogo_get_qty?: number | string | null;
  bogo_discount_percent?: number | string | null;
  happy_hour_start?: string | null;
  happy_hour_end?: string | null;
  days_of_week?: string | null;
}

export interface StorefrontOfferResult {
  hasDiscount: boolean;
  price: number;
  originalPrice: number;
  discountPercent: number;
  offerBadge?: string;
  offerType?: string;
  offerValue?: number;
  offerId?: number;
}

function roundMoney(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
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

export function todayLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isOfferActiveNow(
  offer: RawStorefrontOffer,
  todayIso: string = todayLocalIsoDate(),
  now: Date = new Date(),
): boolean {
  if (offer.is_active === false) return false;

  const from = normalizeDateOnly(offer.start_date);
  const to = normalizeDateOnly(offer.end_date);
  if (from && from > todayIso) return false;
  if (to && to < todayIso) return false;

  // Day of week check (e.g. "0,1,2,3,4,5,6" or "sun,mon,...")
  if (offer.days_of_week && typeof offer.days_of_week === 'string' && offer.days_of_week.trim()) {
    const dayNum = String(now.getDay()); // 0 is Sunday
    const daysAllowed = offer.days_of_week.toLowerCase().split(',').map((d) => d.trim());
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentName = dayNames[now.getDay()];
    if (!daysAllowed.includes(dayNum) && !daysAllowed.includes(currentName)) {
      return false;
    }
  }

  // Happy hour time range check (format "HH:MM")
  if (offer.happy_hour_start && offer.happy_hour_end) {
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    if (currentTimeStr < offer.happy_hour_start || currentTimeStr > offer.happy_hour_end) {
      return false;
    }
  }

  return true;
}

export function calculateOfferAdjustedPrice(
  basePrice: number,
  offer: RawStorefrontOffer,
  qty: number = 1,
): number {
  const offerValue = Number(offer.value || 0);
  const type = offer.offer_type;

  if (type === 'percent') {
    if (offerValue <= 0) return basePrice;
    const discount = (basePrice * offerValue) / 100;
    return roundMoney(Math.max(0, basePrice - discount));
  }

  if (type === 'fixed') {
    if (offerValue <= 0) return basePrice;
    return roundMoney(Math.max(0, basePrice - offerValue));
  }

  if (type === 'price') {
    if (offerValue <= 0) return basePrice;
    return roundMoney(Math.max(0, Math.min(basePrice, offerValue)));
  }

  if (type === 'bundle') {
    const minQty = Math.max(1, Number(offer.min_qty || 1));
    const normalizedQty = Math.max(1, Number(qty || 1));
    if (normalizedQty < minQty) return roundMoney(basePrice);
    const bundles = Math.floor(normalizedQty / minQty);
    const remainder = normalizedQty % minQty;
    const total = (bundles * offerValue) + (remainder * basePrice);
    return roundMoney(total / normalizedQty);
  }

  return roundMoney(basePrice);
}

export function resolveBestStorefrontOffer(
  basePrice: number,
  offers: RawStorefrontOffer[] | undefined,
  qty: number = 1,
  todayIso: string = todayLocalIsoDate(),
  now: Date = new Date(),
): StorefrontOfferResult {
  const roundedBase = roundMoney(basePrice);
  if (!offers || offers.length === 0 || roundedBase <= 0) {
    return {
      hasDiscount: false,
      price: roundedBase,
      originalPrice: roundedBase,
      discountPercent: 0,
    };
  }

  const activeOffers = offers.filter((off) => isOfferActiveNow(off, todayIso, now));
  if (activeOffers.length === 0) {
    return {
      hasDiscount: false,
      price: roundedBase,
      originalPrice: roundedBase,
      discountPercent: 0,
    };
  }

  let bestResult: StorefrontOfferResult = {
    hasDiscount: false,
    price: roundedBase,
    originalPrice: roundedBase,
    discountPercent: 0,
  };

  for (const offer of activeOffers) {
    // If bundle/min_qty specified, verify qty
    const minQty = Math.max(1, Number(offer.min_qty || 1));
    if (offer.offer_type === 'bundle' && qty < minQty) {
      continue;
    }

    const discountedPrice = calculateOfferAdjustedPrice(roundedBase, offer, qty);
    if (discountedPrice < roundedBase) {
      const discountAmount = roundedBase - discountedPrice;
      const discountPercent = Math.round((discountAmount / roundedBase) * 100);

      // We want the offer that gives the shopper the best saving (lowest price)
      if (!bestResult.hasDiscount || discountedPrice < bestResult.price) {
        let badge = `خصم ${discountPercent}%`;
        if (offer.offer_type === 'bundle') {
          badge = `عرض باقة (${offer.min_qty || 1} قطع)`;
        } else if (offer.offer_type === 'fixed') {
          badge = `وفر ${roundMoney(Number(offer.value))} ج`;
        } else if (offer.offer_type === 'price') {
          badge = `سعر خاص`;
        }

        bestResult = {
          hasDiscount: true,
          price: discountedPrice,
          originalPrice: roundedBase,
          discountPercent,
          offerBadge: badge,
          offerType: offer.offer_type,
          offerValue: Number(offer.value || 0),
          offerId: offer.id ? Number(offer.id) : undefined,
        };
      }
    }
  }

  return bestResult;
}
