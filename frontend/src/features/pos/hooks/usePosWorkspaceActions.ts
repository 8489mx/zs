import type { FormEvent } from 'react';
import type { PosPriceType } from '@/features/pos/types/pos.types';
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

  return {
    resetPosDraft: () => base.resetPosDraft(),
    handleAddProduct: base.handleAddProduct,
    handleQuickAddCodeSubmit: base.handleQuickAddCodeSubmit,
    exportHeldDrafts: base.exportHeldDrafts,
    setQty: base.setQty,
    removeItem: base.removeItem,
    fillPaidAmount: base.fillPaidAmount,
    setPriceType: base.applyPriceType,
    setPaymentPreset: base.setPaymentPreset,
    selectCartLine: base.selectCartLine,
    changeSelectedQty: base.changeSelectedQty,
    editSelectedQty: base.editSelectedQty,
    removeSelectedItem: base.removeSelectedItem,
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
