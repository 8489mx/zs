import type { Product, ProductUnit } from '@/types/domain';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';

function safeUnits(product: Product) {
  return product.units?.length ? product.units : [{
    id: '',
    name: 'قطعة',
    multiplier: 1,
    barcode: product.barcode,
    isBaseUnit: true,
    isSaleUnit: true,
    isPurchaseUnit: true
  }];
}

export function getSaleUnit(product: Product): ProductUnit {
  return safeUnits(product).find((unit) => unit.isSaleUnit) || safeUnits(product)[0];
}

export function getStockLimit(product: Product, unit: ProductUnit = getSaleUnit(product)) {
  return Math.floor(Number(product.stock || 0) / Math.max(Number(unit.multiplier || 1), 1));
}

function getActiveOffer(product: Product & { offers?: Array<{ type?: string; value?: number; from?: string; to?: string; start_date?: string; end_date?: string }> }) {
  const today = new Date().toISOString().slice(0, 10);
  return (product.offers || []).find((offer) => {
    const from = String(offer.from || offer.start_date || '').slice(0, 10);
    const to = String(offer.to || offer.end_date || '').slice(0, 10);
    return (!from || from <= today) && (!to || to >= today);
  }) || null;
}

export function getProductPrice(product: Product, priceType: PosPriceType) {
  let price = Number(priceType === 'wholesale' ? product.wholesalePrice || product.retailPrice || 0 : product.retailPrice || 0);
  const offer = getActiveOffer(product as Product & { offers?: Array<{ type?: string; value?: number; from?: string; to?: string }> });
  if (offer) {
    if (offer.type === 'percent') price = Math.max(0, price - ((price * Number(offer.value || 0)) / 100));
    if (offer.type === 'fixed') price = Math.max(0, price - Number(offer.value || 0));
  }
  return Number(price.toFixed(2));
}

export function getAvailableSaleProducts(products: Product[], search: string) {
  const q = search.trim().toLowerCase();
  return products.filter((product) => {
    const stockLimit = getStockLimit(product);
    if (stockLimit <= 0) return false;
    if (!q) return true;
    const unitMatches = safeUnits(product).some((unit) => [unit.name, unit.barcode].some((value) => String(value || '').toLowerCase().includes(q)));
    return [product.name, product.barcode].some((value) => String(value || '').toLowerCase().includes(q)) || unitMatches;
  });
}

interface AddPosItemOptions {
  priceType: PosPriceType;
  unitId?: string;
}

export function addPosItem(cart: PosItem[], product: Product, options: AddPosItemOptions) {
  const unit = safeUnits(product).find((entry) => entry.id === options.unitId) || getSaleUnit(product);
  const stockLimit = getStockLimit(product, unit);
  if (stockLimit <= 0) {
    throw new Error('الصنف غير متاح للبيع حاليًا');
  }
  const priceType = options.priceType;
  const lineKey = `${product.id}::${unit.id || unit.name}::${priceType}`;
  const existing = cart.find((item) => item.lineKey === lineKey);
  if (existing) {
    if (existing.qty + 1 > stockLimit) throw new Error('الكمية المطلوبة أكبر من المخزون المتاح');
    return cart.map((item) => item.lineKey === lineKey ? { ...item, qty: item.qty + 1 } : item);
  }
  return [{
    lineKey,
    productId: product.id,
    name: product.name,
    unitId: unit.id,
    unitName: unit.name,
    unitMultiplier: Math.max(Number(unit.multiplier || 1), 1),
    price: getProductPrice(product, priceType),
    qty: 1,
    stockLimit,
    currentStock: Number(product.stock || 0),
    minStock: Number(product.minStock || 0),
    priceType
  }, ...cart];
}

export function updatePosItemQty(cart: PosItem[], lineKey: string, qty: number) {
  return cart.map((item) => item.lineKey === lineKey ? { ...item, qty: Math.max(1, Math.min(qty, item.stockLimit)) } : item);
}

export function removePosItem(cart: PosItem[], lineKey: string) {
  return cart.filter((row) => row.lineKey !== lineKey);
}
