import { useEffect } from 'react';
import { normalizePaymentChannel } from '@/features/pos/lib/pos-workspace.helpers';
import { buildDraftState, persistDraftSnapshot, persistLastSale, persistRecentProductIds } from '@/features/pos/lib/pos.persistence';
import { isNegativeStockSalesAllowed, syncPosCartStock } from '@/features/pos/lib/pos.domain';
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
  transferAmount,
  setTransferAmount,
  paymentType,
  paymentChannel,
  setPaymentChannel,
  note,
  search,
  priceType,

  products,
  setCart,
  setSubmitMessage,
  recentProductIds,
  lastSale,
  lastAddedLineKey,
  setLastAddedLineKey,
  selectedLineKey,
  setSelectedLineKey,
  discountApprovalSecret,
  setDiscountApprovalSecret,
  settings,
}: {
  cart: PosItem[];
  customerId: string;
  discount: number;
  paidAmount: number;
  cashAmount: number;
  setCashAmount: (value: number) => void;
  cardAmount: number;
  setCardAmount: (value: number) => void;
  transferAmount: number;
  setTransferAmount: (value: number) => void;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  setPaymentChannel: (value: PaymentChannel) => void;
  note: string;
  search: string;
  priceType: PosPriceType;

  products: Product[];
  setCart: (value: PosItem[] | ((current: PosItem[]) => PosItem[])) => void;
  setSubmitMessage: (value: string) => void;
  recentProductIds: string[];
  lastSale: Sale | null;
  lastAddedLineKey: string;
  setLastAddedLineKey: (value: string) => void;
  selectedLineKey: string;
  setSelectedLineKey: (value: string) => void;
  discountApprovalSecret: string;
  setDiscountApprovalSecret: (value: string) => void;
  settings?: { allowNegativeStockSales?: unknown; allowSellingBelowStock?: unknown } | null;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistDraftSnapshot(buildDraftState({ cart, customerId, discount, paidAmount, cashAmount, cardAmount, transferAmount, paymentType, paymentChannel, note, search, priceType, branchId: '', locationId: '' }));
  }, [cart, customerId, discount, paidAmount, cashAmount, cardAmount, transferAmount, paymentType, paymentChannel, note, search, priceType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistRecentProductIds(recentProductIds);
  }, [recentProductIds]);

  useEffect(() => {
    if (!cart.length || !products.length) return;
    const result = syncPosCartStock(cart, products, { allowNegativeStockSales: isNegativeStockSalesAllowed(settings) });
    if (result.cart === cart) return;
    setCart(result.cart);
    if (result.removedCount || result.clampedCount) {
      const parts = [];
      if (result.removedCount) parts.push(`تم حذف ${result.removedCount} صنف غير متاح في الموقع الحالي`);
      if (result.clampedCount) parts.push(`تم تعديل كمية ${result.clampedCount} صنف حسب المخزون المتاح`);
      setSubmitMessage(`${parts.join('، ')}.`);
    }
  }, [cart, products, settings, setCart, setSubmitMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistLastSale(lastSale);
  }, [lastSale]);



  useEffect(() => {
    const nextChannel = normalizePaymentChannel(paymentType, cashAmount, cardAmount, transferAmount, paymentChannel);
    if (paymentChannel !== nextChannel) setPaymentChannel(nextChannel);
    if (paymentType === 'credit') {
      if (cashAmount !== 0) setCashAmount(0);
      if (cardAmount !== 0) setCardAmount(0);
      if (transferAmount !== 0) setTransferAmount(0);
    }
  }, [cashAmount, cardAmount, transferAmount, paymentChannel, paymentType, setCashAmount, setCardAmount, setTransferAmount, setPaymentChannel]);

  useEffect(() => {
    if (!cart.length) {
      if (selectedLineKey) setSelectedLineKey('');
      if (discountApprovalSecret) setDiscountApprovalSecret('');
      return;
    }
    if (selectedLineKey && cart.some((item) => item.lineKey === selectedLineKey)) return;
    const preferredLineKey = cart.some((item) => item.lineKey === lastAddedLineKey) ? lastAddedLineKey : cart[0]?.lineKey || '';
    if (preferredLineKey && preferredLineKey !== selectedLineKey) {
      setSelectedLineKey(preferredLineKey);
    }
  }, [cart, discountApprovalSecret, lastAddedLineKey, selectedLineKey, setDiscountApprovalSecret, setSelectedLineKey]);

  useEffect(() => {
    if (!lastAddedLineKey || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => setLastAddedLineKey(''), 1400);
    return () => window.clearTimeout(timer);
  }, [lastAddedLineKey, setLastAddedLineKey]);
}
