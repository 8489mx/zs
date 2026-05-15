import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PosWorkspaceHeader } from '@/features/pos/components/pos-workspace/PosWorkspaceHeader';
import { PosWorkspaceConfirmDialogs } from '@/features/pos/components/pos-workspace/PosWorkspaceConfirmDialogs';
import { PosSaleSuccessDialog } from '@/features/pos/components/pos-workspace/PosSaleSuccessDialog';
import { PosWorkspaceStartupIssues } from '@/features/pos/components/pos-workspace/PosWorkspaceStatusCards';
import { PosWorkspaceDiscountDialog } from '@/features/pos/components/pos-workspace/PosWorkspaceDiscountDialog';
import { PosWorkspaceMainContent } from '@/features/pos/components/pos-workspace/PosWorkspaceMainContent';
import { PosCheckoutDialog } from '@/features/pos/components/pos-workspace/PosCheckoutDialog';
import { PosHeldDraftsDialog } from '@/features/pos/components/pos-workspace/PosHeldDraftsDialog';
import {
  getSelectedCustomerName,
  printCurrentPosDraft,
} from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import { posApi } from '@/features/pos/api/pos.api';
import { isNegativeStockSalesAllowed } from '@/features/pos/lib/pos.domain';
import { isLikelyBarcodeQuery } from '@/features/pos/lib/pos-product-lookup';
import { normalizePosSaleMode, usePosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { matchProductByCode } from '@/features/pos/lib/pos-workspace.helpers';
import { parseWeightedBarcode } from '@/features/pos/lib/weighted-barcode';
import { usePosWorkspace } from '@/features/pos/hooks/usePosWorkspace';
import { usePosWorkspaceKeyboardShortcuts } from '@/features/pos/hooks/usePosWorkspaceKeyboardShortcuts';

export function PosWorkspace() {
  const pos = usePosWorkspace();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannerSubmitRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [discountApprovalDialogOpen, setDiscountApprovalDialogOpen] = useState(false);
  const [clearCartConfirmOpen, setClearCartConfirmOpen] = useState(false);
  const [lineDeleteConfirmKey, setLineDeleteConfirmKey] = useState('');
  const [heldDeleteConfirmId, setHeldDeleteConfirmId] = useState('');
  const [clearHeldConfirmOpen, setClearHeldConfirmOpen] = useState(false);
  const [saleSuccessDialogOpen, setSaleSuccessDialogOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [heldDraftsDialogOpen, setHeldDraftsDialogOpen] = useState(false);
  const [shortcutRecallDraftId, setShortcutRecallDraftId] = useState('');
  const defaultPosMode = normalizePosSaleMode(pos.settingsQuery.data?.defaultPosMode);
  const [posMode, setPosMode] = usePosSaleMode(defaultPosMode);
  const allowNegativeStockSales = isNegativeStockSalesAllowed(pos.settingsQuery.data);

  const catalogsLoading = pos.productsQuery.isLoading || pos.customersQuery.isLoading || pos.branchesQuery.isLoading || pos.locationsQuery.isLoading || pos.settingsQuery.isLoading;
  const catalogsError = pos.productsQuery.error || pos.customersQuery.error || pos.branchesQuery.error || pos.locationsQuery.error || pos.settingsQuery.error;

  const selectedCustomerName = useMemo(() => getSelectedCustomerName(pos), [pos]);
  const lastSaleCustomer = useMemo(() => {
    const customerId = String(pos.lastSale?.customerId || pos.customerId || '');
    if (!customerId) return null;
    return (pos.customersQuery.data || []).find((customer) => String(customer.id) === customerId) || null;
  }, [pos.customerId, pos.customersQuery.data, pos.lastSale?.customerId]);
  const cartPiecesCount = useMemo(() => pos.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [pos.cart]);
  const cartItemsCount = pos.cart.length;
  const lineDeleteConfirmItem = useMemo(
    () => pos.cart.find((item) => item.lineKey === lineDeleteConfirmKey) || null,
    [lineDeleteConfirmKey, pos.cart],
  );
  const heldDeleteConfirmDraft = useMemo(
    () => pos.heldDraftSummaries.find((draft) => draft.id === heldDeleteConfirmId) || null,
    [heldDeleteConfirmId, pos.heldDraftSummaries],
  );

  const printCurrentDraft = useCallback(() => {
    printCurrentPosDraft(pos, selectedCustomerName);
  }, [pos, selectedCustomerName]);

  const focusBarcodeEntry = useCallback(() => {
    const handle = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(handle);
  }, []);

  const requestDiscountAuthorization = useCallback(() => {
    setDiscountApprovalDialogOpen(true);
  }, []);

  const requestClearCart = useCallback(() => {
    if (!pos.cart.length) {
      pos.resetPosDraft();
      return;
    }
    setClearCartConfirmOpen(true);
  }, [pos]);

  const requestLineDelete = useCallback((lineKey: string) => {
    if (!lineKey) return;
    setLineDeleteConfirmKey(lineKey);
  }, []);

  const requestSelectedLineDelete = useCallback(() => {
    if (!pos.selectedLineKey) return;
    setLineDeleteConfirmKey(pos.selectedLineKey);
  }, [pos.selectedLineKey]);

  const requestHeldDelete = useCallback((draftId: string) => {
    setHeldDeleteConfirmId(draftId);
  }, []);

  const requestClearHeldDrafts = useCallback(() => {
    if (!pos.heldDraftSummaries.length) return;
    setClearHeldConfirmOpen(true);
  }, [pos.heldDraftSummaries.length]);

  const requestCheckoutDialog = useCallback(() => {
    if (pos.createSale.isPending) return;
    setCheckoutDialogOpen(true);
  }, [pos.createSale.isPending]);

  const requestRecallHeldDraftByIndex = useCallback((index: number) => {
    const targetDraft = pos.heldDraftSummaries[index];
    if (!targetDraft) return;
    if (!pos.cart.length) {
      void pos.recallDraft(targetDraft.id);
      return;
    }
    setShortcutRecallDraftId(targetDraft.id);
    setHeldDraftsDialogOpen(true);
  }, [pos]);

  const handleQuickAddSubmit = useCallback((rawCode?: string) => {
    const code = String(rawCode ?? pos.quickAddCode).trim();
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (code && lastScannerSubmitRef.current.code === code && (now - lastScannerSubmitRef.current.at) < 90) {
      return false;
    }
    const submitted = pos.handleQuickAddCodeSubmit(rawCode);
    if (submitted) lastScannerSubmitRef.current = { code, at: now };
    return submitted;
  }, [pos]);

  const resolveRemoteBarcodeMatch = useCallback((query: string) => {
    void (async () => {
      try {
        const lookupProducts = await posApi.lookupProducts({ barcode: query, locationId: pos.locationId, limit: 5 });
        const remoteMatch = matchProductByCode(lookupProducts, query);
        if (remoteMatch.status === 'matched') {
          const submitted = pos.handleQuickAddCodeSubmit(query, lookupProducts);
          if (submitted) pos.setSearch('');
          return;
        }
        if (remoteMatch.status === 'ambiguous') {
          pos.setSubmitMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
        } else {
          const weightedBarcode = parseWeightedBarcode(query, pos.settingsQuery.data || null);
          if (weightedBarcode) {
            const weightedLookupProducts = await posApi.lookupProducts({ barcode: weightedBarcode.productCode, locationId: pos.locationId, limit: 5 });
            const weightedSubmitted = pos.handleQuickAddCodeSubmit(query, weightedLookupProducts);
            if (weightedSubmitted) {
              pos.setSearch('');
              return;
            }

            const weightedSearchProducts = await posApi.lookupProducts({ q: weightedBarcode.productCode, locationId: pos.locationId, limit: 5 });
            const weightedSearchSubmitted = pos.handleQuickAddCodeSubmit(query, weightedSearchProducts);
            if (weightedSearchSubmitted) {
              pos.setSearch('');
              return;
            }

            const strippedProductCode = weightedBarcode.productCode.replace(/^0+/, '') || weightedBarcode.productCode;
            if (strippedProductCode !== weightedBarcode.productCode) {
              const strippedSearchProducts = await posApi.lookupProducts({ q: strippedProductCode, locationId: pos.locationId, limit: 5 });
              const strippedSearchSubmitted = pos.handleQuickAddCodeSubmit(query, strippedSearchProducts);
              if (strippedSearchSubmitted) {
                pos.setSearch('');
                return;
              }
            }
          }
          pos.setSubmitMessage('لا توجد نتيجة مطابقة الآن لإضافتها.');
        }
      } catch (error) {
        pos.setSubmitMessage(error instanceof Error ? error.message : 'تعذر البحث عن الصنف.');
      }
      focusBarcodeEntry();
    })();
  }, [focusBarcodeEntry, pos]);

  const submitFirstSearchResult = useCallback(() => {
    const query = pos.search.trim();
    if (!query) {
      pos.setSubmitMessage('اكتب اسم الصنف أو اضرب الباركود أولًا.');
      focusBarcodeEntry();
      return false;
    }

    const exactCodeMatch = matchProductByCode(pos.productsQuery.data || [], query);
    if (exactCodeMatch.status === 'matched') {
      const submitted = handleQuickAddSubmit(query);
      if (submitted) pos.setSearch('');
      return submitted;
    }
    if (exactCodeMatch.status === 'ambiguous') {
      pos.setSubmitMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
      focusBarcodeEntry();
      return false;
    }

    if (exactCodeMatch.status === 'not-found') {
      const weightedBarcode = parseWeightedBarcode(query, pos.settingsQuery.data || null);
      if (weightedBarcode) {
        const submitted = handleQuickAddSubmit(query);
        if (submitted) {
          pos.setSearch('');
          return true;
        }
      }
    }

    if (exactCodeMatch.status === 'not-found' && isLikelyBarcodeQuery(query)) {
      resolveRemoteBarcodeMatch(query);
      return true;
    }

    const firstProduct = pos.filteredSaleProducts[0];
    if (!firstProduct) {
      pos.setSubmitMessage('لا توجد نتيجة مطابقة الآن لإضافتها.');
      focusBarcodeEntry();
      return false;
    }
    pos.handleAddProduct(firstProduct);
    pos.setSearch('');
    return true;
  }, [focusBarcodeEntry, handleQuickAddSubmit, pos, resolveRemoteBarcodeMatch]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = ' ';
    return ' ';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (catalogsLoading) return;
    const activeElement = document.activeElement as HTMLElement | null;
    const isTypingTarget = Boolean(activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT' || activeElement.isContentEditable));
    if (isTypingTarget) return;
    return focusBarcodeEntry();
  }, [catalogsLoading, focusBarcodeEntry]);

  useEffect(() => {
    if (catalogsLoading) return;
    return focusBarcodeEntry();
  }, [catalogsLoading, focusBarcodeEntry, pos.barcodeFocusTick]);

  useEffect(() => {
    if (pos.canShowLastSaleActions && pos.lastSale) {
      setSaleSuccessDialogOpen(true);
    }
  }, [pos.canShowLastSaleActions, pos.lastSale]);

  usePosWorkspaceKeyboardShortcuts({
    pos,
    focusBarcodeEntry,
    printCurrentDraft,
    onRequestClearCart: requestClearCart,
    onRequestLineDelete: requestLineDelete,
    onRequestCheckout: requestCheckoutDialog,
    onOpenHeldDrafts: () => setHeldDraftsDialogOpen(true),
    onRecallHeldDraftByIndex: requestRecallHeldDraftByIndex,
  });

  return (
    <div className={`page-stack page-shell pos-workspace pos-premium-shell pos-sale-mode-${posMode}`.trim()}>
      <PosWorkspaceHeader pos={pos} posMode={posMode} onModeChange={setPosMode} onFocusSearch={focusBarcodeEntry} onPrintDraft={printCurrentDraft} />

      <PosWorkspaceStartupIssues pos={pos} />

      <PosWorkspaceMainContent
        pos={pos}
        posMode={posMode}
        catalogsLoading={catalogsLoading}
        catalogsError={catalogsError}
        allowNegativeStockSales={allowNegativeStockSales}
        searchInputRef={searchInputRef}
        cartPiecesCount={cartPiecesCount}
        cartItemsCount={cartItemsCount}
        onSubmitFirstSearchResult={submitFirstSearchResult}
        onRequestDiscountAuthorization={requestDiscountAuthorization}
        onRequestLineDelete={requestLineDelete}
        onRequestSelectedLineDelete={requestSelectedLineDelete}
        onRequestHeldDelete={requestHeldDelete}
        onRequestClearHeldDrafts={requestClearHeldDrafts}
        onRequestClearCart={requestClearCart}
        onRequestCheckout={requestCheckoutDialog}
        heldDraftsCount={pos.heldDraftSummaries.length}
        onOpenHeldDrafts={() => setHeldDraftsDialogOpen(true)}
        onPrintCurrentDraft={printCurrentDraft}
        onFocusBarcodeEntry={focusBarcodeEntry}
      />

      <PosCheckoutDialog
        open={checkoutDialogOpen}
        pos={pos}
        selectedCustomerName={selectedCustomerName}
        onClose={() => setCheckoutDialogOpen(false)}
        onRequestDiscountAuthorization={requestDiscountAuthorization}
        onConfirmSale={() => {
          setCheckoutDialogOpen(false);
          void pos.handleSubmit();
        }}
      />

      <PosWorkspaceDiscountDialog
        open={discountApprovalDialogOpen}
        pos={pos}
        onClose={() => setDiscountApprovalDialogOpen(false)}
        onFocusBarcodeEntry={focusBarcodeEntry}
      />

      <PosHeldDraftsDialog
        open={heldDraftsDialogOpen}
        heldDrafts={pos.heldDraftSummaries}
        hasActiveCart={pos.cart.length > 0}
        requestedRecallDraftId={shortcutRecallDraftId}
        onRequestedRecallHandled={() => setShortcutRecallDraftId('')}
        onClose={() => {
          setHeldDraftsDialogOpen(false);
          setShortcutRecallDraftId('');
        }}
        onRecall={async (draftId) => { await pos.recallDraft(draftId); }}
        onDelete={async (draftId) => { await pos.deleteDraft(draftId); }}
        onClearAll={async () => { await pos.clearHeldDrafts(); }}
      />

      <PosWorkspaceConfirmDialogs
        clearCartConfirmOpen={clearCartConfirmOpen}
        lineDeleteConfirmItem={lineDeleteConfirmItem}
        heldDeleteConfirmDraft={heldDeleteConfirmDraft}
        clearHeldConfirmOpen={clearHeldConfirmOpen}
        heldDraftsCount={pos.heldDraftSummaries.length}
        onCancelClearCart={() => {
          setClearCartConfirmOpen(false);
          focusBarcodeEntry();
        }}
        onConfirmClearCart={() => {
          pos.resetPosDraft();
          setClearCartConfirmOpen(false);
        }}
        onCancelLineDelete={() => {
          setLineDeleteConfirmKey('');
          focusBarcodeEntry();
        }}
        onConfirmLineDelete={() => {
          if (lineDeleteConfirmKey) pos.removeItem(lineDeleteConfirmKey);
          setLineDeleteConfirmKey('');
          focusBarcodeEntry();
        }}
        onCancelHeldDelete={() => {
          setHeldDeleteConfirmId('');
          focusBarcodeEntry();
        }}
        onConfirmHeldDelete={async () => {
          if (heldDeleteConfirmId) await pos.deleteDraft(heldDeleteConfirmId);
          setHeldDeleteConfirmId('');
          focusBarcodeEntry();
        }}
        onCancelClearHeld={() => {
          setClearHeldConfirmOpen(false);
          focusBarcodeEntry();
        }}
        onConfirmClearHeld={async () => {
          await pos.clearHeldDrafts();
          setClearHeldConfirmOpen(false);
          focusBarcodeEntry();
        }}
      />

      <PosSaleSuccessDialog
        open={saleSuccessDialogOpen && Boolean(pos.canShowLastSaleActions && pos.lastSale)}
        sale={pos.lastSale}
        customer={lastSaleCustomer}
        settings={pos.settingsQuery.data || null}
        onClose={() => setSaleSuccessDialogOpen(false)}
        onNewSale={() => {
          pos.completePostSaleCycle();
          setSaleSuccessDialogOpen(false);
          focusBarcodeEntry();
        }}
        onPrintReceipt={pos.printReceiptNow}
        onPrintA4={pos.printA4Now}
      />
    </div>
  );
}
