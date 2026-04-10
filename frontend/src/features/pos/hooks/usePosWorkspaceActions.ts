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
  handleSubmit: () => Promise<void>;
  exportHeldDrafts: () => void;
  holdDraft: () => Promise<void>;
  recallDraft: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  clearHeldDrafts: () => Promise<void>;
  reprintLastSale: () => void;
  copyLastSaleSummary: () => Promise<void>;
  setQty: (lineKey: string, qty: number) => void;
  removeItem: (lineKey: string) => void;
  fillPaidAmount: () => void;
  setPriceType: (nextPriceType: PosPriceType) => void;
  heldDraftSummaries: Array<{ id: string; label: string; total: number; itemsCount: number }>;
}

export function createPosWorkspaceActions(params: PosWorkspaceActionParams): PosWorkspaceActions {
  const base = createPosWorkspaceBaseActions(params);
  const asyncActions = createPosWorkspaceAsyncActions(params, base);
  const receiptActions = createPosWorkspaceReceiptActions(params);

  return {
    resetPosDraft: base.resetPosDraft,
    handleAddProduct: base.handleAddProduct,
    handleQuickAddCodeSubmit: base.handleQuickAddCodeSubmit,
    exportHeldDrafts: base.exportHeldDrafts,
    setQty: base.setQty,
    removeItem: base.removeItem,
    fillPaidAmount: base.fillPaidAmount,
    setPriceType: base.applyPriceType,
    handleQuickCustomerSubmit: asyncActions.handleQuickCustomerSubmit,
    handleSubmit: asyncActions.handleSubmit,
    holdDraft: asyncActions.holdDraft,
    recallDraft: asyncActions.recallDraft,
    deleteDraft: asyncActions.deleteDraft,
    clearHeldDrafts: asyncActions.clearHeldDrafts,
    reprintLastSale: receiptActions.reprintLastSale,
    copyLastSaleSummary: receiptActions.copyLastSaleSummary,
    heldDraftSummaries: receiptActions.heldDraftSummaries,
  };
}

export type { PosWorkspaceActionParams };
