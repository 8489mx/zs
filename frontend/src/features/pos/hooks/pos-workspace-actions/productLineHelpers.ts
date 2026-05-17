import type { PosItem } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';

export function resolveSaleUnit(product: Product, unitId?: string) {
  return product.units?.find((entry) => String(entry.id || '') === String(unitId || ''))
    || product.units?.find((entry) => entry.isSaleUnit)
    || product.units?.[0];
}

export function resolveAvailableQty(product: Product, unitMultiplier: number, isWeighted = false) {
  const raw = Number(product.stock || 0) / Math.max(unitMultiplier || 1, 1);
  return isWeighted ? Number(raw.toFixed(3)) : Math.floor(raw);
}

export function findLineQty(cart: PosItem[], lineKey: string) {
  return Number(cart.find((item) => item.lineKey === lineKey)?.qty || 0);
}
