import type { Product, Purchase } from '@/types/domain';
import type { PurchaseHeaderOutput } from '@/features/purchases/schemas/purchase.schema';

export interface PurchaseDraftItem {
  productId: string;
  name: string;
  qty: number;
  cost: number;
  total: number;
  unitName: string;
  unitMultiplier: number;
}

export function buildPurchaseDraftItem(product: Product, qty: number, cost: number): PurchaseDraftItem {
  const purchaseUnit = product.units?.find((unit) => unit.isPurchaseUnit) || product.units?.[0];
  const safeQty = Number(qty || 0);
  const safeCost = Number(cost || 0);
  return {
    productId: String(product.id),
    name: product.name,
    qty: safeQty,
    cost: safeCost,
    total: Number((safeQty * safeCost).toFixed(2)),
    unitName: purchaseUnit?.name || 'وحدة',
    unitMultiplier: Number(purchaseUnit?.multiplier || 1)
  };
}

export function upsertPurchaseDraftItem(items: PurchaseDraftItem[], incoming: PurchaseDraftItem) {
  const index = items.findIndex((item) => item.productId === incoming.productId && item.unitName === incoming.unitName);
  if (index === -1) return [...items, incoming];
  const next = items.slice();
  const mergedQty = Number((next[index].qty + incoming.qty).toFixed(3));
  next[index] = {
    ...next[index],
    qty: mergedQty,
    cost: incoming.cost,
    total: Number((mergedQty * incoming.cost).toFixed(2))
  };
  return next;
}

export function buildPurchasePayload(values: PurchaseHeaderOutput, items: PurchaseDraftItem[], taxRate: number, pricesIncludeTax: boolean) {
  const subTotal = Number(items.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2));
  const discount = Number(Math.max(0, Number(values.discount || 0)).toFixed(2));
  const taxable = Math.max(0, subTotal - discount);
  const taxAmount = !taxRate ? 0 : pricesIncludeTax
    ? Number((taxable - taxable / (1 + taxRate / 100)).toFixed(2))
    : Number((taxable * (taxRate / 100)).toFixed(2));
  const total = pricesIncludeTax ? Number(taxable.toFixed(2)) : Number((taxable + taxAmount).toFixed(2));

  return {
    supplierId: Number(values.supplierId),
    paymentType: values.paymentType,
    discount,
    branchId: values.branchId ? Number(values.branchId) : null,
    locationId: values.locationId ? Number(values.locationId) : null,
    note: values.note || '',
    taxRate: Number(taxRate || 0),
    pricesIncludeTax: Boolean(pricesIncludeTax),
    items: items.map((item) => ({
      productId: Number(item.productId),
      qty: Number(item.qty),
      cost: Number(item.cost),
      total: Number(item.total),
      unitName: item.unitName,
      unitMultiplier: Number(item.unitMultiplier || 1)
    })),
    subTotal,
    taxAmount,
    total
  };
}

export function buildPurchaseCancelReason(docNo?: string) {
  return `إلغاء فاتورة الشراء ${docNo || ''}`.trim();
}

export function buildPurchaseUpdatePayload(purchase: Purchase, payload: {
  paymentType: string;
  discount: number;
  note: string;
  editReason: string;
  managerPin: string;
  items: Array<{ productId: string; qty: number; cost: number; unitName: string; unitMultiplier: number }>;
}) {
  const subTotal = Number(payload.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.cost || 0), 0).toFixed(2));
  const discount = Number(Math.max(0, payload.discount || 0).toFixed(2));
  const taxable = Math.max(0, subTotal - discount);
  const taxRate = Number(purchase.taxRate || 0);
  const taxAmount = !taxRate ? 0 : purchase.pricesIncludeTax
    ? Number((taxable - taxable / (1 + taxRate / 100)).toFixed(2))
    : Number((taxable * (taxRate / 100)).toFixed(2));
  const total = purchase.pricesIncludeTax ? Number(taxable.toFixed(2)) : Number((taxable + taxAmount).toFixed(2));

  return {
    supplierId: purchase.supplierId ? Number(purchase.supplierId) : null,
    paymentType: payload.paymentType === 'credit' ? 'credit' : 'cash',
    discount,
    note: payload.note || '',
    editReason: String(payload.editReason || '').trim(),
    managerPin: String(payload.managerPin || '').trim(),
    taxRate,
    pricesIncludeTax: Boolean(purchase.pricesIncludeTax),
    branchId: purchase.branchId ? Number(purchase.branchId) : null,
    locationId: purchase.locationId ? Number(purchase.locationId) : null,
    items: payload.items.map((item) => ({
      productId: Number(item.productId),
      qty: Number(item.qty),
      cost: Number(item.cost),
      unitName: item.unitName,
      unitMultiplier: Number(item.unitMultiplier || 1)
    })),
    subTotal,
    taxAmount,
    total
  };
}
