import type { FormEvent } from 'react';
import { removePosItem } from '@/features/pos/lib/pos.domain';
import { computeDraftTotal } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import { posApi } from '@/features/pos/api/pos.api';
import type { Product } from '@/types/domain';
import {
  createPosWorkspaceAsyncActions,
  createPosWorkspaceBaseActions,
  createPosWorkspaceReceiptActions,
  type PosWorkspaceActionParams,
} from '@/features/pos/hooks/usePosWorkspaceActionGroups';

interface PosWorkspaceActions {
  resetPosDraft: () => void;
  handleAddProduct: (product: Product) => void;
  handleQuickAddCodeSubmit: (rawCode?: string) => boolean;
  handleQuickCustomerSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  approveDiscountOverride: (password: string) => Promise<unknown>;
  handleSubmit: (options?: { fastCash?: boolean }) => Promise<void>;
  exportHeldDrafts: () => void;
  holdDraft: () => Promise<void>;
  recallDraft: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  clearHeldDrafts: () => Promise<void>;
  reprintLastSale: () => void;
  printReceiptNow: () => void;
  printA4Now: () => void;
  exportPdfNow: () => void;
  setQty: (lineKey: string, qty: number) => void;
  removeItem: (lineKey: string) => void;
  fillPaidAmount: () => void;
  setPriceType: (nextPriceType: PosPriceType) => void;
  setPaymentPreset: (preset: 'cash' | 'card' | 'credit') => void;
  selectCartLine: (lineKey: string) => void;
  changeSelectedQty: (delta: number) => boolean;
  editSelectedQty: () => boolean;
  removeSelectedItem: () => boolean;
  selectAdjacentCartLine: (direction: 'next' | 'prev') => boolean;
  heldDraftSummaries: Array<{ id: string; label: string; total: number; itemsCount: number }>;
}

export function createPosWorkspaceActions(params: PosWorkspaceActionParams): PosWorkspaceActions {
  const base = createPosWorkspaceBaseActions(params);
  const asyncActions = createPosWorkspaceAsyncActions(params, base);
  const receiptActions = createPosWorkspaceReceiptActions(params);

  function logDraftCancelEvent() {
    if (!params.cart.length) return;
    void posApi.logSecurityEvent({
      eventType: 'draft_cancel',
      total: Number(computeDraftTotal({
        cart: params.cart,
        customerId: params.customerId,
        discount: params.discount,
        paidAmount: params.paidAmount,
        cashAmount: params.cashAmount,
        cardAmount: params.cardAmount,
        paymentType: params.paymentType,
        paymentChannel: params.paymentChannel,
        note: params.note,
        search: params.search,
        priceType: params.priceType,
        branchId: params.branchId,
        locationId: params.locationId,
      }).toFixed(2)),
      cartItemsCount: params.cart.length,
      note: 'إلغاء المسودة الحالية من واجهة الكاشير',
    });
  }

  function logCartRemoveEvent(lineKey: string) {
    const removed = params.cart.find((item) => item.lineKey === lineKey);
    if (!removed) return;
    const remainingCart = removePosItem(params.cart, lineKey);
    void posApi.logSecurityEvent({
      eventType: 'cart_remove',
      productId: Number(removed.productId || 0) || undefined,
      productName: removed.name || undefined,
      qty: Number(removed.qty || 0) || undefined,
      total: Number(computeDraftTotal({
        cart: remainingCart,
        customerId: params.customerId,
        discount: params.discount,
        paidAmount: params.paidAmount,
        cashAmount: params.cashAmount,
        cardAmount: params.cardAmount,
        paymentType: params.paymentType,
        paymentChannel: params.paymentChannel,
        note: params.note,
        search: params.search,
        priceType: params.priceType,
        branchId: params.branchId,
        locationId: params.locationId,
      }).toFixed(2)),
      cartItemsCount: remainingCart.length,
      note: 'حذف عنصر من سلة الكاشير',
    });
  }

  return {
    resetPosDraft: () => {
      logDraftCancelEvent();
      base.resetPosDraft();
    },
    handleAddProduct: base.handleAddProduct,
    handleQuickAddCodeSubmit: base.handleQuickAddCodeSubmit,
    exportHeldDrafts: base.exportHeldDrafts,
    setQty: base.setQty,
    removeItem: (lineKey: string) => {
      logCartRemoveEvent(lineKey);
      base.removeItem(lineKey);
    },
    fillPaidAmount: base.fillPaidAmount,
    setPriceType: base.applyPriceType,
    setPaymentPreset: base.setPaymentPreset,
    selectCartLine: base.selectCartLine,
    changeSelectedQty: base.changeSelectedQty,
    editSelectedQty: base.editSelectedQty,
    removeSelectedItem: () => {
      if (!params.selectedLineKey) return false;
      logCartRemoveEvent(params.selectedLineKey);
      return base.removeSelectedItem();
    },
    selectAdjacentCartLine: base.selectAdjacentCartLine,
    handleQuickCustomerSubmit: asyncActions.handleQuickCustomerSubmit,
    approveDiscountOverride: asyncActions.approveDiscountOverride,
    handleSubmit: asyncActions.handleSubmit,
    holdDraft: asyncActions.holdDraft,
    recallDraft: asyncActions.recallDraft,
    deleteDraft: asyncActions.deleteDraft,
    clearHeldDrafts: asyncActions.clearHeldDrafts,
    reprintLastSale: receiptActions.reprintLastSale,
    printReceiptNow: receiptActions.printReceiptNow,
    printA4Now: receiptActions.printA4Now,
    exportPdfNow: receiptActions.exportPdfNow,
    heldDraftSummaries: receiptActions.heldDraftSummaries,
  };
}

export type { PosWorkspaceActionParams };
