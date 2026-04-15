import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { Product } from '@/types/domain';
import type { PaymentChannel, PaymentType, PosDraftSnapshot } from '@/features/pos/hooks/usePosWorkspace';

export function normalizePaymentChannel(paymentType: PaymentType, cashAmount: number, cardAmount: number): PaymentChannel {
  if (paymentType === 'credit') return 'credit';
  const hasCash = Number(cashAmount || 0) > 0;
  const hasCard = Number(cardAmount || 0) > 0;
  if (hasCash && hasCard) return 'mixed' as PaymentChannel;
  if (hasCard) return 'card';
  return 'cash';
}

export function paymentLabel(paymentType: PaymentType, paymentChannel: string) {
  if (paymentType === 'credit') return 'آجل';
  if (paymentChannel === 'mixed') return 'مختلط';
  if (paymentChannel === 'card') return 'فيزا';
  return 'نقدي';
}

export function computeDraftTotal(draft: PosDraftSnapshot) {
  return draft.cart.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0) - Number(draft.discount || 0);
}

export function matchProductByCode(products: Product[], rawCode: string) {
  const code = String(rawCode || '').trim().toLowerCase();
  if (!code) return { status: 'empty' as const };
  const matches = [];
  for (const product of products) {
    if (String(product.barcode || '').trim().toLowerCase() === code) {
      matches.push({ product, unitName: null, multiplier: 1, kind: 'product' as const });
    }
    for (const unit of (product.units || [])) {
      if (String(unit.barcode || '').trim().toLowerCase() === code) {
        matches.push({ product, unitName: unit.name || null, multiplier: Number(unit.multiplier || 1) || 1, kind: 'unit' as const });
      }
    }
  }
  if (!matches.length) return { status: 'not-found' as const };
  const preferredUnits = matches.filter((entry) => entry.kind === 'unit');
  if (preferredUnits.length > 1) return { status: 'ambiguous' as const, matches: preferredUnits };
  const uniqueProductIds = Array.from(new Set(matches.map((entry) => entry.product.id)));
  if (uniqueProductIds.length > 1) return { status: 'ambiguous' as const, matches };
  const preferred = preferredUnits[0] || matches[0];
  return { status: 'matched' as const, match: preferred };
}

export function buildSaleLineKey(product: Product, priceType: PosPriceType) {
  const saleUnit = product.units?.find((entry) => entry.isSaleUnit) || product.units?.[0];
  return `${product.id}::${saleUnit?.id || saleUnit?.name || ''}::${priceType}`;
}
