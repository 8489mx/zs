import { useEffect } from 'react';
import { isInteractiveElement, isPosModalOpen } from '@/features/pos/lib/pos-keyboard-safety';

interface PosWorkspaceKeyboardShortcutsParams {
  pos: {
    cart: unknown[];
    selectedLineKey: string;
    paymentType: 'cash' | 'credit';
    canShowLastSaleActions: boolean;
    selectAdjacentCartLine: (direction: 'next' | 'prev') => void;
    changeSelectedQty: (delta: number) => void;
    printReceiptNow: () => void;
    holdDraft: () => void | Promise<void>;
    reprintLastSale: () => void;
    printA4Now: () => void;
  };
  focusBarcodeEntry: () => void;
  printCurrentDraft: () => void;
  onRequestClearCart: () => void;
  onRequestLineDelete: (lineKey: string) => void;
  onRequestCheckout: () => void;
}

export function usePosWorkspaceKeyboardShortcuts({
  pos,
  focusBarcodeEntry,
  printCurrentDraft,
  onRequestClearCart,
  onRequestLineDelete,
  onRequestCheckout,
}: PosWorkspaceKeyboardShortcutsParams) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));

      if (event.key === 'F3') {
        event.preventDefault();
        focusBarcodeEntry();
        return;
      }
      if (event.key === 'Escape') {
        if (isPosModalOpen() || isInteractiveElement(target)) return;
        if (pos.cart.length) {
          event.preventDefault();
          onRequestClearCart();
        }
        return;
      }
      if (isTypingTarget && !['F2', 'F4', 'F6', 'F8', 'F9', 'F12'].includes(event.key)) return;
      if (!isTypingTarget && pos.selectedLineKey) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          pos.selectAdjacentCartLine('next');
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          pos.selectAdjacentCartLine('prev');
          return;
        }
        if (event.key === 'Delete') {
          event.preventDefault();
          onRequestLineDelete(pos.selectedLineKey);
          return;
        }
        if (event.key === '+' || event.code === 'NumpadAdd' || event.key === '=') {
          event.preventDefault();
          pos.changeSelectedQty(1);
          return;
        }
        if (event.key === '-' || event.code === 'NumpadSubtract') {
          event.preventDefault();
          pos.changeSelectedQty(-1);
          return;
        }
      }
      if (event.key === 'F2') {
        event.preventDefault();
        if (pos.canShowLastSaleActions) {
          pos.printReceiptNow();
        } else {
          onRequestCheckout();
        }
      } else if (event.key === 'F4') {
        event.preventDefault();
        void pos.holdDraft();
      } else if (event.key === 'F6') {
        event.preventDefault();
        pos.reprintLastSale();
      } else if (event.key === 'F8') {
        event.preventDefault();
        printCurrentDraft();
      } else if (event.key === 'F9') {
        event.preventDefault();
        pos.reprintLastSale();
      } else if (event.key === 'F12') {
        event.preventDefault();
        if (pos.canShowLastSaleActions) pos.printA4Now();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [focusBarcodeEntry, onRequestCheckout, onRequestClearCart, onRequestLineDelete, pos, printCurrentDraft]);
}
