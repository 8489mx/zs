import type { Product, ProductOffer, ProductUnit } from '@/types/domain';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';

function safeUnits(product: Product) {
  return product.units?.length ? product.units : [{
    id: '',
    name: 'قطعة',
    multiplier: 1,
    barcode: product.barcode,
    isBaseUnit: true,
    isSaleUnit: true,
    isPurchaseUnit: true,
  }];
}

function normalizeDateOnly(value: unknown) {
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
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function roundQuantity(value: number) {
  return Number(Number(value || 0).toFixed(3));
}

function getMinimumSaleQuantity(isWeighted?: boolean) {
  return isWeighted ? 0.001 : 1;
}

function normalizeSaleQuantity(value: number, isWeighted?: boolean) {
  const numericValue = Number(value || 0);
  if (isWeighted) {
    return roundQuantity(Math.max(getMinimumSaleQuantity(true), numericValue));
  }
  return Math.max(1, Math.round(numericValue || 1));
}

function getResolvedStockLimit(product: Product, unit: ProductUnit, allowDecimal: boolean) {
  const multiplier = Math.max(Number(unit.multiplier || 1), 1);
  const rawLimit = Number(product.stock || 0) / multiplier;
  return allowDecimal ? roundQuantity(rawLimit) : Math.floor(rawLimit);
}

function todayLocalIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOfferType(offer: ProductOffer): 'percent' | 'fixed' | 'price' | 'bundle' {
  if (offer.type === 'bundle' || offer.offer_type === 'bundle') return 'bundle';
  if (offer.type === 'price' || offer.offer_type === 'price') return 'price';
  if (offer.type === 'fixed' || offer.offer_type === 'fixed') return 'fixed';
  return 'percent';
}

function getOfferAppliedPrice(basePrice: number, offer: ProductOffer, qty = 1) {
  const type = getOfferType(offer);
  const offerVal = Number(offer.value || 0);
  if (type === 'percent') return roundMoney(Math.max(0, basePrice - ((basePrice * offerVal) / 100)));
  if (type === 'fixed') return roundMoney(Math.max(0, basePrice - offerVal));
  if (type === 'price') return roundMoney(Math.max(0, offerVal));
  if (type === 'bundle') {
    const minQty = getOfferMinQty(offer);
    const normalizedQty = Math.max(1, qty);
    if (normalizedQty < minQty) return roundMoney(basePrice);
    const bundles = Math.floor(normalizedQty / minQty);
    const remainder = normalizedQty % minQty;
    const total = (bundles * offerVal) + (remainder * basePrice);
    return roundMoney(total / normalizedQty);
  }
  return roundMoney(basePrice);
}

function getOfferMinQty(offer: ProductOffer) {
  return Math.max(1, Number(offer.minQty ?? offer.min_qty ?? 1));
}

function getApplicableOffer(product: Product, priceType: PosPriceType, qty = 1) {
  if (priceType === 'wholesale') return null;
  const today = todayLocalIsoDate();
  const basePrice = Number(product.retailPrice || 0);
  const normalizedQty = Math.max(1, qty);
  const applicableOffers = (product.offers || []).filter((offer) => {
    const from = normalizeDateOnly(offer.from || offer.start_date || '');
    const to = normalizeDateOnly(offer.to || offer.end_date || '');
    const minQty = getOfferMinQty(offer);
    return (!from || from <= today) && (!to || to >= today) && normalizedQty >= minQty;
  });

  if (!applicableOffers.length) return null;

  return [...applicableOffers].sort((left, right) => {
    const leftMinQty = getOfferMinQty(left);
    const rightMinQty = getOfferMinQty(right);
    if (leftMinQty !== rightMinQty) return rightMinQty - leftMinQty;

    const leftPrice = getOfferAppliedPrice(basePrice, left, normalizedQty);
    const rightPrice = getOfferAppliedPrice(basePrice, right, normalizedQty);
    if (leftPrice !== rightPrice) return leftPrice - rightPrice;

    return Number(right.value || 0) - Number(left.value || 0);
  })[0] || null;
}

export function getSaleUnit(product: Product): ProductUnit {
  return safeUnits(product).find((unit) => unit.isSaleUnit) || safeUnits(product)[0];
}

export function getStockLimit(product: Product, unit: ProductUnit = getSaleUnit(product)) {
  return getResolvedStockLimit(product, unit, false);
}

const UNBOUNDED_STOCK_LIMIT = Number.MAX_SAFE_INTEGER;

export function isNegativeStockSalesAllowed(settings?: { allowNegativeStockSales?: unknown; allowSellingBelowStock?: unknown } | null) {
  return settings?.allowNegativeStockSales === true || settings?.allowSellingBelowStock === true;
}

export function getProductItemCode(product: Product, unit?: ProductUnit) {
  return String(product.styleCode || unit?.barcode || product.barcode || product.id || '').trim();
}

export function getProductPrice(product: Product, priceType: PosPriceType, qty = 1) {
  const basePrice = Number(priceType === 'wholesale' ? product.wholesalePrice || product.retailPrice || 0 : product.retailPrice || 0);
  const offer = getApplicableOffer(product, priceType, qty);
  return offer ? getOfferAppliedPrice(basePrice, offer, qty) : roundMoney(basePrice);
}

export function getOfferDisplayName(offer: ProductOffer) {
  const type = getOfferType(offer);
  const minQty = getOfferMinQty(offer);
  const qtyText = minQty > 1 ? ` عند شراء ${minQty} أو أكثر` : '';
  const val = Number(offer.value || 0);
  
  if (type === 'percent') return `تم تفعيل عرض: خصم ${val}%${qtyText}`;
  if (type === 'fixed') return `تم تفعيل عرض: خصم ${val} ثابت${qtyText}`;
  if (type === 'price') return `تم تفعيل عرض: سعر خاص ${val}${qtyText}`;
  if (type === 'bundle') return `تم تفعيل عرض باقة: ${minQty} قطع بسعر ${val} ج.م`;
  return 'تم تفعيل عرض خاص';
}

export function repriceCartLine(item: PosItem, product: Product, qty: number) {
  const basePrice = Number(item.priceType === 'wholesale' ? product.wholesalePrice || product.retailPrice || 0 : product.retailPrice || 0);
  const offer = getApplicableOffer(product, item.priceType, qty);
  const effectivePrice = offer ? getOfferAppliedPrice(basePrice, offer, qty) : roundMoney(basePrice);
  
  let origPrice = basePrice;
  let offerDiscount = 0;
  let offerName = offer ? getOfferDisplayName(offer) : undefined;

  if (offer) {
    offerDiscount = roundMoney(Math.max(0, basePrice - effectivePrice));
  } else if (item.priceType !== 'wholesale' && product.comboOriginalPrice && Number(product.comboOriginalPrice) > effectivePrice) {
    origPrice = Number(product.comboOriginalPrice);
    offerDiscount = roundMoney(Math.max(0, origPrice - effectivePrice));
    offerName = product.comboComponentsSummary 
      ? `عرض مجمع (${product.comboComponentsSummary})`
      : 'عرض مجمع';
  }
  
  return {
    ...item,
    qty,
    price: effectivePrice,
    originalPrice: origPrice,
    offerDiscount,
    offerName,
  };
}

export function getAvailableSaleProducts(products: Product[], search: string, filter = 'all') {
  const q = search.trim().toLowerCase();
  return products.filter((product) => {
    const type = product.itemType || (product as any).item_type;

    if (filter === 'raw_materials') {
      if (type !== 'raw_material') return false;
    } else if (filter === 'services') {
      if (type !== 'service') return false;
    } else {
      if (type === 'raw_material') return false;
    }

    // Always include the product in the catalog regardless of stock level.
    // Stock-zero products remain visible so the cashier can see them and get a
    // meaningful "out of stock" message when trying to add them.  The actual
    // stock enforcement happens inside addPosItem / handleAddProduct.
    if (!q) return true;
    const unitMatches = safeUnits(product).some((unit) => [unit.name, unit.barcode].some((value) => String(value || '').toLowerCase().includes(q)));
    return [product.name, product.barcode].some((value) => String(value || '').toLowerCase().includes(q)) || unitMatches;
  });
}

interface AddPosItemOptions {
  priceType: PosPriceType;
  unitId?: string;
  allowNegativeStockSales?: boolean;
  quantity?: number;
  isWeighted?: boolean;
  sourceBarcode?: string;
  serialNumber?: string;
}

export function addPosItem(cart: PosItem[], product: Product, options: AddPosItemOptions) {
  const unit = safeUnits(product).find((entry) => entry.id === options.unitId) || getSaleUnit(product);
  const isWeighted = options.isWeighted === true;
  const minQty = getMinimumSaleQuantity(isWeighted);
  const requestedQty = normalizeSaleQuantity(options.quantity ?? 1, isWeighted);
  const isService = product.itemType === 'service' || (product as any).item_type === 'service';
  const stockLimit = (options.allowNegativeStockSales || isService) ? UNBOUNDED_STOCK_LIMIT : getResolvedStockLimit(product, unit, isWeighted);
  if (stockLimit < minQty) {
    const globalStock = Number((product as any).globalStock || 0);
    if (globalStock >= minQty && stockLimit <= 0) {
      throw new Error('الصنف موجود، لكنه غير متاح في مخزون هذا الفرع.');
    }
    throw new Error('الصنف غير متاح للبيع حاليًا.');
  }
  if (requestedQty > stockLimit) {
    throw new Error('الكمية المطلوبة أكبر من المخزون المتاح');
  }
  const priceType = options.priceType;
  const lineKey = `${product.id}::${unit.id || unit.name}::${priceType}`;
  const existing = cart.find((item) => item.lineKey === lineKey);
  const incomingSerial = options.serialNumber || product.matchedSerialNumber || undefined;
  const isSerialized = Boolean(product.trackSerials || incomingSerial);

  if (existing) {
    const nextQty = roundQuantity(Number(existing.qty || 0) + requestedQty);
    if (nextQty > stockLimit) throw new Error('الكمية المطلوبة أكبر من المخزون المتاح');
    const existingSerials = existing.serials || [];
    const nextSerials = incomingSerial && !existingSerials.includes(incomingSerial)
      ? [...existingSerials, incomingSerial]
      : existingSerials;

    return cart.map((item) => item.lineKey === lineKey
      ? repriceCartLine({
          ...item,
          isWeighted: item.isWeighted === true || isWeighted ? true : undefined,
          sourceBarcode: options.sourceBarcode || item.sourceBarcode,
          stockLimit,
          trackSerials: isSerialized || item.trackSerials,
          serials: nextSerials.length > 0 ? nextSerials : undefined,
          quantityChunks: (item.isWeighted === true || isWeighted) && options.sourceBarcode 
            ? [...(item.quantityChunks || [Number(item.qty || 0)]), requestedQty] 
            : item.quantityChunks,
        }, product, nextQty)
      : item);
  }
  const newItem: PosItem = {
    lineKey,
    productId: product.id,
    name: product.name,
    itemCode: getProductItemCode(product, unit),
    unitId: unit.id,
    unitName: unit.name,
    unitMultiplier: Math.max(Number(unit.multiplier || 1), 1),
    price: 0,
    costPrice: Number((product as any).costPrice || 0),
    qty: requestedQty,
    stockLimit,
    currentStock: Number(product.stock || 0),
    minStock: Number(product.minStock || 0),
    priceType,
    isWeighted: isWeighted ? true : undefined,
    sourceBarcode: options.sourceBarcode || undefined,
    quantityChunks: isWeighted && options.sourceBarcode ? [requestedQty] : undefined,
    trackSerials: isSerialized ? true : undefined,
    serials: incomingSerial ? [incomingSerial] : undefined,
  };

  return [...cart, repriceCartLine(newItem, product, requestedQty)];
}

export function updatePosItemQty(cart: PosItem[], lineKey: string, qty: number, products: Product[]) {
  return cart.map((item) => {
    if (item.lineKey !== lineKey) return item;
    const isWeighted = item.isWeighted === true;
    const normalizedQty = normalizeSaleQuantity(qty, isWeighted);
    const nextQty = Math.min(normalizedQty, item.stockLimit);
    const product = products.find((entry) => String(entry.id) === String(item.productId));
    if (!product) return { ...item, qty: nextQty };
    return repriceCartLine(item, product, nextQty);
  });
}

export function updatePosItemNotes(cart: PosItem[], lineKey: string, notes: string) {
  return cart.map((item) => {
    if (item.lineKey !== lineKey) return item;
    return { ...item, notes };
  });
}

export function updatePosItemModifiers(cart: PosItem[], lineKey: string, modifiers: any[]) {
  return cart.map((item) => {
    if (item.lineKey !== lineKey) return item;
    return { ...item, modifiers };
  });
}

export function updatePosItemQtyWithOptions(
  cart: PosItem[],
  lineKey: string,
  qty: number,
  products: Product[],
  options: { allowNegativeStockSales?: boolean; quantityChunks?: number[] | null } = {},
) {
  return cart.map((item) => {
    if (item.lineKey !== lineKey) return item;
    const isWeighted = item.isWeighted === true;
    const normalizedQty = normalizeSaleQuantity(qty, isWeighted);
    const product = products.find((entry) => String(entry.id) === String(item.productId));
    const resolvedChunks = options.quantityChunks === null ? undefined : (options.quantityChunks || item.quantityChunks);
    if (!product) {
      const nextQty = options.allowNegativeStockSales ? normalizedQty : Math.min(normalizedQty, item.stockLimit);
      return { ...item, qty: nextQty, quantityChunks: resolvedChunks };
    }
    const stockLimit = options.allowNegativeStockSales || !!product.hasBom ? UNBOUNDED_STOCK_LIMIT : item.stockLimit;
    const finalQty = options.allowNegativeStockSales || !!product.hasBom ? normalizedQty : Math.min(normalizedQty, stockLimit);
    return repriceCartLine({ ...item, quantityChunks: resolvedChunks }, product, finalQty);
  });
}

export function removePosItem(cart: PosItem[], lineKey: string) {
  return cart.filter((row) => row.lineKey !== lineKey);
}

export function syncPosCartStock(cart: PosItem[], products: Product[], options: { allowNegativeStockSales?: boolean } = {}) {
  let changed = false;
  let removedCount = 0;
  let clampedCount = 0;

  const nextCart = cart.flatMap((item) => {
    const product = products.find((entry) => String(entry.id) === String(item.productId));
    if (!product) return [item];
    const unit = safeUnits(product).find((entry) => String(entry.id || '') === String(item.unitId || '') || String(entry.name || '') === String(item.unitName || '')) || getSaleUnit(product);
    const isWeighted = item.isWeighted === true;
    const minQty = getMinimumSaleQuantity(isWeighted);
    const stockLimit = (options.allowNegativeStockSales || !!product.hasBom) ? UNBOUNDED_STOCK_LIMIT : getResolvedStockLimit(product, unit, isWeighted);
    if (stockLimit < minQty) {
      changed = true;
      removedCount += 1;
      return [];
    }

    const normalizedQty = normalizeSaleQuantity(Number(item.qty || minQty), isWeighted);
    const nextQty = Math.min(normalizedQty, stockLimit);
    const nextItem = {
      ...item,
      name: product.name || item.name,
      unitId: String(unit.id || item.unitId || ''),
      unitName: unit.name || item.unitName,
      itemCode: getProductItemCode(product, unit) || item.itemCode,
      unitMultiplier: Math.max(Number(unit.multiplier || 1), 1),
      stockLimit,
      currentStock: Number(product.stock || 0),
      minStock: Number(product.minStock || 0),
      price: getProductPrice(product, item.priceType, nextQty),
      qty: nextQty,
      quantityChunks: nextQty === Number(item.qty || 0) ? item.quantityChunks : undefined,
    };

    if (nextQty !== item.qty) {
      changed = true;
      clampedCount += 1;
    }

    if (
      String(nextItem.name || '') !== String(item.name || '')
      || Number(nextItem.stockLimit) !== Number(item.stockLimit)
      || Number(nextItem.currentStock) !== Number(item.currentStock)
      || Number(nextItem.minStock) !== Number(item.minStock)
      || Number(nextItem.unitMultiplier) !== Number(item.unitMultiplier)
      || Number(nextItem.price) !== Number(item.price)
      || String(nextItem.unitId || '') !== String(item.unitId || '')
      || String(nextItem.unitName || '') !== String(item.unitName || '')
    ) {
      changed = true;
    }

    return [nextItem];
  });

  return {
    cart: changed ? nextCart : cart,
    removedCount,
    clampedCount,
  };
}
