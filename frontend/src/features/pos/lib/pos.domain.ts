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

function getOfferAppliedPrice(basePrice: number, offer: ProductOffer) {
  const type = getOfferType(offer);
  if (type === 'percent') return roundMoney(Math.max(0, basePrice - ((basePrice * Number(offer.value || 0)) / 100)));
  if (type === 'fixed') return roundMoney(Math.max(0, basePrice - Number(offer.value || 0)));
  if (type === 'price') return roundMoney(Math.max(0, Number(offer.value || 0)));
  return roundMoney(basePrice);
}

function getOfferType(offer: ProductOffer) {
  return offer.type === 'price' || offer.offer_type === 'price'
    ? 'price'
    : offer.type === 'fixed' || offer.offer_type === 'fixed'
      ? 'fixed'
      : 'percent';
}

function getOfferMinQty(offer: ProductOffer) {
  return Math.max(1, Number(offer.minQty ?? offer.min_qty ?? 1));
}

function getApplicableOffer(product: Product, priceType: PosPriceType, qty = 1) {
  const today = todayLocalIsoDate();
  const basePrice = Number(priceType === 'wholesale' ? product.wholesalePrice || product.retailPrice || 0 : product.retailPrice || 0);
  const applicableOffers = (product.offers || []).filter((offer) => {
    const from = normalizeDateOnly(offer.from || offer.start_date || '');
    const to = normalizeDateOnly(offer.to || offer.end_date || '');
    const minQty = getOfferMinQty(offer);
    return (!from || from <= today) && (!to || to >= today) && qty >= minQty;
  });

  if (!applicableOffers.length) return null;

  return [...applicableOffers].sort((left, right) => {
    const leftMinQty = getOfferMinQty(left);
    const rightMinQty = getOfferMinQty(right);
    if (leftMinQty !== rightMinQty) return rightMinQty - leftMinQty;

    const leftPrice = getOfferAppliedPrice(basePrice, left);
    const rightPrice = getOfferAppliedPrice(basePrice, right);
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

function getProductItemCode(product: Product, unit?: ProductUnit) {
  return String(product.styleCode || unit?.barcode || product.barcode || product.id || '').trim();
}

export function getProductPrice(product: Product, priceType: PosPriceType, qty = 1) {
  const basePrice = Number(priceType === 'wholesale' ? product.wholesalePrice || product.retailPrice || 0 : product.retailPrice || 0);
  const offer = getApplicableOffer(product, priceType, qty);
  return offer ? getOfferAppliedPrice(basePrice, offer) : roundMoney(basePrice);
}

function repriceCartLine(item: PosItem, product: Product, qty: number) {
  return {
    ...item,
    qty,
    price: getProductPrice(product, item.priceType, qty),
  };
}

export function getAvailableSaleProducts(products: Product[], search: string, allowNegativeStockSales = false, filter = 'all') {
  const q = search.trim().toLowerCase();
  return products.filter((product) => {
    const type = product.itemType || (product as any).item_type;
    
    if (filter === 'raw_materials') {
      if (type !== 'raw_material') return false;
    } else {
      if (type === 'raw_material') return false;
    }

    const stockLimit = getStockLimit(product);
    if (!allowNegativeStockSales && stockLimit <= 0) return false;
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
}

export function addPosItem(cart: PosItem[], product: Product, options: AddPosItemOptions) {
  const unit = safeUnits(product).find((entry) => entry.id === options.unitId) || getSaleUnit(product);
  const isWeighted = options.isWeighted === true;
  const minQty = getMinimumSaleQuantity(isWeighted);
  const requestedQty = normalizeSaleQuantity(options.quantity ?? 1, isWeighted);
  const stockLimit = options.allowNegativeStockSales ? UNBOUNDED_STOCK_LIMIT : getResolvedStockLimit(product, unit, isWeighted);
  if (stockLimit < minQty) {
    throw new Error('الصنف غير متاح للبيع حاليًا');
  }
  const priceType = options.priceType;
  const lineKey = `${product.id}::${unit.id || unit.name}::${priceType}`;
  const existing = cart.find((item) => item.lineKey === lineKey);
  if (existing) {
    const nextQty = roundQuantity(Number(existing.qty || 0) + requestedQty);
    if (nextQty > stockLimit) throw new Error('الكمية المطلوبة أكبر من المخزون المتاح');
    return cart.map((item) => item.lineKey === lineKey
      ? repriceCartLine({
          ...item,
          isWeighted: item.isWeighted === true || isWeighted ? true : undefined,
          sourceBarcode: options.sourceBarcode || item.sourceBarcode,
          stockLimit,
        }, product, nextQty)
      : item);
  }
  return [{
    lineKey,
    productId: product.id,
    name: product.name,
    itemCode: getProductItemCode(product, unit),
    unitId: unit.id,
    unitName: unit.name,
    unitMultiplier: Math.max(Number(unit.multiplier || 1), 1),
    price: getProductPrice(product, priceType, requestedQty),
    qty: requestedQty,
    stockLimit,
    currentStock: Number(product.stock || 0),
    minStock: Number(product.minStock || 0),
    priceType,
    isWeighted: isWeighted ? true : undefined,
    sourceBarcode: options.sourceBarcode || undefined,
  }, ...cart];
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

export function updatePosItemQtyWithOptions(
  cart: PosItem[],
  lineKey: string,
  qty: number,
  products: Product[],
  options: { allowNegativeStockSales?: boolean } = {},
) {
  return cart.map((item) => {
    if (item.lineKey !== lineKey) return item;
    const isWeighted = item.isWeighted === true;
    const normalizedQty = normalizeSaleQuantity(qty, isWeighted);
    const nextQty = options.allowNegativeStockSales ? normalizedQty : Math.min(normalizedQty, item.stockLimit);
    const product = products.find((entry) => String(entry.id) === String(item.productId));
    if (!product) return { ...item, qty: nextQty };
    return repriceCartLine(item, product, nextQty);
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
    const stockLimit = options.allowNegativeStockSales ? UNBOUNDED_STOCK_LIMIT : getResolvedStockLimit(product, unit, isWeighted);
    if (stockLimit < minQty) {
      changed = true;
      removedCount += 1;
      return [];
    }

    const normalizedQty = normalizeSaleQuantity(Number(item.qty || minQty), isWeighted);
    const nextQty = Math.min(normalizedQty, stockLimit);
    const nextItem = {
      ...item,
      unitId: String(unit.id || item.unitId || ''),
      unitName: unit.name || item.unitName,
      itemCode: getProductItemCode(product, unit) || item.itemCode,
      unitMultiplier: Math.max(Number(unit.multiplier || 1), 1),
      stockLimit,
      currentStock: Number(product.stock || 0),
      minStock: Number(product.minStock || 0),
      price: getProductPrice(product, item.priceType, nextQty),
      qty: nextQty,
    };

    if (nextQty !== item.qty) {
      changed = true;
      clampedCount += 1;
    }

    if (
      Number(nextItem.stockLimit) !== Number(item.stockLimit)
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
