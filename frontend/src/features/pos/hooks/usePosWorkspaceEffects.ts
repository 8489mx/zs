import { useEffect } from 'react';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { normalizePaymentChannel } from '@/features/pos/lib/pos-workspace.helpers';
import { buildDraftState, persistDraftSnapshot, persistLastSale, persistRecentProductIds } from '@/features/pos/lib/pos.persistence';
import { syncPosCartStock } from '@/features/pos/lib/pos.domain';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';
import type { Product, Sale } from '@/types/domain';
import type { PaymentChannel, PaymentType } from '@/features/pos/hooks/usePosWorkspace';

export function usePosWorkspaceEffects({
  cart,
  customerId,
  discount,
  paidAmount,
  cashAmount,
  setCashAmount,
  cardAmount,
  setCardAmount,
  paymentType,
  paymentChannel,
  setPaymentChannel,
  note,
  search,
  priceType,
  branchId,
  setBranchId,
  locationId,
  setLocationId,
  products,
  setCart,
  setSubmitMessage,
  recentProductIds,
  lastSale,
  lastAddedLineKey,
  setLastAddedLineKey,
  selectedLineKey,
  setSelectedLineKey,
  branches,
  locations,
}: {
  cart: PosItem[];
  customerId: string;
  discount: number;
  paidAmount: number;
  cashAmount: number;
  setCashAmount: (value: number) => void;
  cardAmount: number;
  setCardAmount: (value: number) => void;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  setPaymentChannel: (value: PaymentChannel) => void;
  note: string;
  search: string;
  priceType: PosPriceType;
  branchId: string;
  setBranchId: (value: string) => void;
  locationId: string;
  setLocationId: (value: string) => void;
  products: Product[];
  setCart: (value: PosItem[] | ((current: PosItem[]) => PosItem[])) => void;
  setSubmitMessage: (value: string) => void;
  recentProductIds: string[];
  lastSale: Sale | null;
  lastAddedLineKey: string;
  setLastAddedLineKey: (value: string) => void;
  selectedLineKey: string;
  setSelectedLineKey: (value: string) => void;
  branches: Array<{ id: string | number }>;
  locations: Array<{ id: string | number }>;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistDraftSnapshot(buildDraftState({ cart, customerId, discount, paidAmount, cashAmount, cardAmount, paymentType, paymentChannel, note, search, priceType, branchId, locationId }));
  }, [cart, customerId, discount, paidAmount, cashAmount, cardAmount, paymentType, paymentChannel, note, search, priceType, branchId, locationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistRecentProductIds(recentProductIds);
  }, [recentProductIds]);

  useEffect(() => {
    if (!cart.length || !products.length) return;
    const result = syncPosCartStock(cart, products);
    if (result.cart === cart) return;
    setCart(result.cart);
    if (result.removedCount || result.clampedCount) {
      const parts = [];
      if (result.removedCount) parts.push(`تم حذف ${result.removedCount} صنف غير متاح في الموقع الحالي`);
      if (result.clampedCount) parts.push(`تم تعديل كمية ${result.clampedCount} صنف حسب المخزون المتاح`);
      setSubmitMessage(`${parts.join('، ')}.`);
    }
  }, [cart, products, setCart, setSubmitMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistLastSale(lastSale);
  }, [lastSale]);

  useEffect(() => {
    if (!SINGLE_STORE_MODE) return;
    if (!branchId && branches[0]?.id) setBranchId(String(branches[0].id));
    if (!locationId && locations[0]?.id) setLocationId(String(locations[0].id));
  }, [branchId, locationId, branches, locations, setBranchId, setLocationId]);

  useEffect(() => {
    const nextChannel = normalizePaymentChannel(paymentType, cashAmount, cardAmount);
    if (paymentChannel !== nextChannel) setPaymentChannel(nextChannel);
    if (paymentType === 'credit') {
      if (cashAmount !== 0) setCashAmount(0);
      if (cardAmount !== 0) setCardAmount(0);
    }
  }, [cashAmount, cardAmount, paymentChannel, paymentType, setCashAmount, setCardAmount, setPaymentChannel]);

  useEffect(() => {
    if (!cart.length) {
      if (selectedLineKey) setSelectedLineKey('');
      return;
    }
    if (selectedLineKey && cart.some((item) => item.lineKey === selectedLineKey)) return;
    const preferredLineKey = cart.some((item) => item.lineKey === lastAddedLineKey) ? lastAddedLineKey : cart[0]?.lineKey || '';
    if (preferredLineKey && preferredLineKey !== selectedLineKey) {
      setSelectedLineKey(preferredLineKey);
    }
  }, [cart, lastAddedLineKey, selectedLineKey, setSelectedLineKey]);

  useEffect(() => {
    if (!lastAddedLineKey || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => setLastAddedLineKey(''), 1400);
    return () => window.clearTimeout(timer);
  }, [lastAddedLineKey, setLastAddedLineKey]);
}
