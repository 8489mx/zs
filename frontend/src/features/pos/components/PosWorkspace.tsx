import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PosWorkspaceHeader } from '@/features/pos/components/pos-workspace/PosWorkspaceHeader';
import { PosWorkspaceConfirmDialogs } from '@/features/pos/components/pos-workspace/PosWorkspaceConfirmDialogs';
import { PosSaleSuccessDialog } from '@/features/pos/components/pos-workspace/PosSaleSuccessDialog';
import { PosWorkspaceDiscountDialog } from '@/features/pos/components/pos-workspace/PosWorkspaceDiscountDialog';
import { PosWorkspaceWholesaleDialog } from '@/features/pos/components/pos-workspace/PosWorkspaceWholesaleDialog';
import { PosWorkspaceMainContent } from '@/features/pos/components/pos-workspace/PosWorkspaceMainContent';
import { PosCheckoutDialog } from '@/features/pos/components/pos-workspace/PosCheckoutDialog';
import { PosHeldDraftsDialog } from '@/features/pos/components/pos-workspace/PosHeldDraftsDialog';
import { PosItemModifiersModal } from '@/features/pos/components/pos-cart-panel/PosItemModifiersModal';
import { PosDraftSwitcherOverlay } from '@/features/pos/components/pos-workspace/PosDraftSwitcherOverlay';
import { PosOpenShiftModal } from '@/features/pos/components/pos-workspace/PosOpenShiftModal';
import { SerialLookupModal } from '@/features/products/components/SerialLookupModal';
import { QuickProductModal } from '@/shared/components/QuickProductModal';
import { PosNewProductModal } from '@/features/pos/components/pos-workspace/PosNewProductModal';
import { PosScannedInvoiceModal } from '@/features/pos/components/pos-workspace/PosScannedInvoiceModal';
import { salesApi } from '@/features/sales/api/sales.api';
import {
  getSelectedCustomerName,
  printCurrentPosDraft,
} from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import { posApi } from '@/features/pos/api/pos.api';
import { isNegativeStockSalesAllowed } from '@/features/pos/lib/pos.domain';
import { isLikelyBarcodeQuery } from '@/features/pos/lib/pos-product-lookup';
import { normalizePosSaleMode, usePosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { matchProductByCode } from '@/features/pos/lib/pos-workspace.helpers';
import { parseWeightedBarcode, matchProductByWeightedCode } from '@/features/pos/lib/weighted-barcode';
import { parseQuantityPrefixQuery } from '@/features/pos/lib/pos-quantity-prefix';
import { usePosWorkspace } from '@/features/pos/hooks/usePosWorkspace';
import { usePosWorkspaceKeyboardShortcuts } from '@/features/pos/hooks/usePosWorkspaceKeyboardShortcuts';
import {
  isInvoiceBarcodeQuery,
  getNormalizedInvoiceSearchTerms,
  matchesSaleDocNo,
  remapArabicKeyboardToEnglish,
} from '@/features/pos/lib/pos-barcode-normalizer';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { Sale } from '@/types/domain';

export function PosWorkspace() {
  const pos = usePosWorkspace();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannerSubmitRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [discountApprovalDialogOpen, setDiscountApprovalDialogOpen] = useState(false);
  const [wholesaleApprovalDialogOpen, setWholesaleApprovalDialogOpen] = useState(false);
  const [clearCartConfirmOpen, setClearCartConfirmOpen] = useState(false);
  const [lineDeleteConfirmKey, setLineDeleteConfirmKey] = useState('');
  const [heldDeleteConfirmId, setHeldDeleteConfirmId] = useState('');
  const [clearHeldConfirmOpen, setClearHeldConfirmOpen] = useState(false);
  const [saleSuccessDialogOpen, setSaleSuccessDialogOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [heldDraftsDialogOpen, setHeldDraftsDialogOpen] = useState(false);
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [serialLookupOpen, setSerialLookupOpen] = useState(false);
  const [quickServiceOpen, setQuickServiceOpen] = useState(false);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductInitialName, setNewProductInitialName] = useState('');
  const [newProductInitialBarcode, setNewProductInitialBarcode] = useState('');
  const [modifiersModalLineKey, setModifiersModalLineKey] = useState<string>('');
  const [shortcutRecallDraftId, setShortcutRecallDraftId] = useState('');
  const [scannedSale, setScannedSale] = useState<Sale | null>(null);
  const [scannedSaleModalOpen, setScannedSaleModalOpen] = useState(false);
  const defaultPosMode = normalizePosSaleMode(pos.settingsQuery.data?.defaultPosMode);
  const [posMode, setPosMode] = usePosSaleMode(defaultPosMode);

  const handlePriceTypeChange = useCallback((nextPriceType: PosPriceType) => {
    if (nextPriceType === 'wholesale' && !pos.canSellWholesale) {
      setWholesaleApprovalDialogOpen(true);
      return;
    }
    pos.setPriceType(nextPriceType);
  }, [pos.canSellWholesale, pos.setPriceType]);

  const handleOpenNewProduct = useCallback((params?: { name?: string; barcode?: string }) => {
    setNewProductInitialName(params?.name || '');
    setNewProductInitialBarcode(params?.barcode || '');
    setNewProductModalOpen(true);
  }, []);
  const allowNegativeStockSales = isNegativeStockSalesAllowed(pos.settingsQuery.data);

  const catalogsLoading = pos.productsQuery.isLoading || pos.customersQuery.isLoading || pos.branchesQuery.isLoading || pos.locationsQuery.isLoading || pos.settingsQuery.isLoading;
  const catalogsError = pos.productsQuery.error || pos.customersQuery.error || pos.branchesQuery.error || pos.locationsQuery.error || pos.settingsQuery.error;

  const selectedCustomer = useMemo(() => {
    return (pos.customersQuery.data || []).find((c) => String(c.id) === pos.customerId) || null;
  }, [pos.customerId, pos.customersQuery.data]);
  const selectedCustomerName = useMemo(() => getSelectedCustomerName(pos), [pos]);
  const lastSaleCustomer = useMemo(() => {
    const customerId = String(pos.lastSale?.customerId || pos.customerId || '');
    if (!customerId) return null;
    return (pos.customersQuery.data || []).find((customer) => String(customer.id) === customerId) || null;
  }, [pos.customerId, pos.customersQuery.data, pos.lastSale?.customerId]);
  const cartQtySummaries = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of pos.cart) {
      const unit = item.unitName || 'قطعة';
      map.set(unit, (map.get(unit) || 0) + Number(item.qty || 0));
    }
    return Array.from(map.entries()).map(([unit, qty]) => `${qty.toLocaleString('ar-EG', { maximumFractionDigits: 3 })} ${unit}`);
  }, [pos.cart]);
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
    printCurrentPosDraft(pos, selectedCustomerName, selectedCustomer?.phone, selectedCustomer?.address);
  }, [pos, selectedCustomerName, selectedCustomer]);

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
    if (pos.requiresCashierShift && !pos.ownOpenShift) {
      setOpenShiftModalOpen(true);
      return;
    }
    if (!pos.canOpenCheckout) {
      if (pos.checkoutDisabledReason) pos.setSubmitMessage(pos.checkoutDisabledReason);
      return;
    }
    setCheckoutDialogOpen(true);
  }, [pos.canOpenCheckout, pos.checkoutDisabledReason, pos.createSale.isPending, pos.ownOpenShift, pos.requiresCashierShift, pos.setSubmitMessage]);

  const requestRecallHeldDraftByIndex = useCallback(async (index: number) => {
    const draftId = pos.heldDraftSummaries[index]?.id;
    if (draftId) {
      await pos.recallDraft(draftId);
      setHeldDraftsDialogOpen(false);
    }
  }, [pos]);

  const requestItemModifiers = useCallback((lineKey: string) => {
    setModifiersModalLineKey(lineKey);
  }, []);

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

  const resolveScannedInvoice = useCallback(async (rawQuery: string): Promise<boolean> => {
    try {
      const searchTerms = getNormalizedInvoiceSearchTerms(rawQuery);
      if (!searchTerms.length) return false;

      // 1. Fast path: Search the primary normalized term directly
      const primaryTerm = searchTerms[0];
      const salesResult = await salesApi.listPage({ search: primaryTerm, pageSize: 5 });
      const matchingSale = (salesResult.rows || []).find((s) => {
        if (String(s.id) === primaryTerm) return true;
        if (matchesSaleDocNo(s.docNo, primaryTerm)) return true;
        if (matchesSaleDocNo(s.docNo, rawQuery)) return true;
        return false;
      }) || (salesResult.rows?.length === 1 ? salesResult.rows[0] : null);

      if (matchingSale) {
        setScannedSale(matchingSale);
        setScannedSaleModalOpen(true);
        pos.setSearch('');
        pos.setSubmitMessage('');
        return true;
      }

      // 2. Parallel fallback for remaining search terms if primary didn't catch
      if (searchTerms.length > 1) {
        const remainingTerms = searchTerms.slice(1, 3);
        const results = await Promise.all(
          remainingTerms.map((term) => salesApi.listPage({ search: term, pageSize: 5 }))
        );
        for (const res of results) {
          const found = (res.rows || []).find((s) => matchesSaleDocNo(s.docNo, rawQuery)) || (res.rows?.length === 1 ? res.rows[0] : null);
          if (found) {
            setScannedSale(found);
            setScannedSaleModalOpen(true);
            pos.setSearch('');
            pos.setSubmitMessage('');
            return true;
          }
        }
      }
    } catch {
      // Ignore
    }
    return false;
  }, [pos]);

  const resolveRemoteBarcodeMatch = useCallback((rawQuery: string) => {
    void (async () => {
      try {
        const parsed = parseQuantityPrefixQuery(rawQuery);
        const query = parsed.cleanQuery || rawQuery;

        // 1. Check if invoice first
        const isInvoice = await resolveScannedInvoice(query);
        if (isInvoice) return;

        const weightedBarcode = parseWeightedBarcode(query, pos.settingsQuery.data || null);
        if (weightedBarcode) {
          const weightedLookupProducts = await posApi.lookupProducts({ barcode: weightedBarcode.productCode, branchId: pos.branchId, locationId: pos.locationId, limit: 5 });
          const weightedSubmitted = pos.handleQuickAddCodeSubmit(rawQuery, weightedLookupProducts);
          if (weightedSubmitted) {
            pos.setSearch('');
            return;
          }

          const strippedProductCode = weightedBarcode.productCode.replace(/^0+/, '') || weightedBarcode.productCode;
          if (strippedProductCode !== weightedBarcode.productCode) {
            const strippedSearchProducts = await posApi.lookupProducts({ q: strippedProductCode, branchId: pos.branchId, locationId: pos.locationId, limit: 5 });
            const strippedSearchSubmitted = pos.handleQuickAddCodeSubmit(rawQuery, strippedSearchProducts);
            if (strippedSearchSubmitted) {
              pos.setSearch('');
              return;
            }
          }
          
          pos.setSubmitMessage(`باركود ميزان: لم يتم العثور على كود الصنف ${weightedBarcode.productCode}.`);
          focusBarcodeEntry();
          return;
        }

        const remappedQuery = remapArabicKeyboardToEnglish(query);
        const lookupProducts = await posApi.lookupProducts({ barcode: query, branchId: pos.branchId, locationId: pos.locationId, limit: 5 });
        let remoteMatch = matchProductByCode(lookupProducts, query);

        if (remoteMatch.status !== 'matched' && remappedQuery !== query) {
          const remappedLookup = await posApi.lookupProducts({ barcode: remappedQuery, branchId: pos.branchId, locationId: pos.locationId, limit: 5 });
          const remappedMatch = matchProductByCode(remappedLookup, remappedQuery);
          if (remappedMatch.status === 'matched') {
            const submitted = pos.handleQuickAddCodeSubmit(remappedQuery, remappedLookup);
            if (submitted) { pos.setSearch(''); return; }
            focusBarcodeEntry();
            return;
          }
        }

        if (remoteMatch.status === 'matched') {
          const submitted = pos.handleQuickAddCodeSubmit(rawQuery, lookupProducts);
          if (submitted) { pos.setSearch(''); return; }
          // Product found but blocked (e.g. zero stock in this branch) — error already set by handleAddProduct
          focusBarcodeEntry();
          return;
        }

        // Fallback check invoice again
        const fallbackInvoice = await resolveScannedInvoice(rawQuery);
        if (fallbackInvoice) return;

        if (remoteMatch.status === 'ambiguous') {
          pos.setSubmitMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
        } else {
          pos.setSubmitMessage('لا توجد نتيجة مطابقة الآن لإضافتها.');
        }
      } catch (error) {
        pos.setSubmitMessage(error instanceof Error ? error.message : 'تعذر البحث عن الصنف.');
      }
      focusBarcodeEntry();
    })();
  }, [focusBarcodeEntry, pos, resolveScannedInvoice]);

  const submitFirstSearchResult = useCallback((rawQuery?: string) => {
    const raw = String(rawQuery ?? pos.search).trim();
    if (!raw) {
      pos.setSubmitMessage('اكتب اسم الصنف أو اضرب الباركود أولًا.');
      focusBarcodeEntry();
      return false;
    }

    const parsed = parseQuantityPrefixQuery(raw);
    const query = parsed.cleanQuery || raw;
    const requestedQuantity = parsed.hasPrefix ? parsed.quantity : 1;

    // 1. Direct Invoice lookup if matching pattern
    if (isInvoiceBarcodeQuery(query) || isInvoiceBarcodeQuery(raw)) {
      void (async () => {
        const isInvoice = await resolveScannedInvoice(query);
        if (!isInvoice) {
          resolveRemoteBarcodeMatch(raw);
        }
      })();
      return true;
    }

    if (parsed.isSuffixQuantityChange) {
      const targetLineKey = pos.selectedLineKey || pos.lastAddedLineKey || pos.cart[0]?.lineKey;
      if (targetLineKey) {
        pos.setQty(targetLineKey, parsed.quantity);
        pos.setSearch('');
        pos.setSubmitMessage(`تم تعديل الكمية إلى ${parsed.quantity}.`);
        focusBarcodeEntry();
        return true;
      }
    }

    if (parsed.hasPrefix && !parsed.cleanQuery) {
      pos.setSubmitMessage(`الكمية المحددة: ${parsed.quantity} — اضرب الباركود أو اكتب اسم الصنف`);
      focusBarcodeEntry();
      return true;
    }

    const exactCodeMatch = matchProductByCode(pos.productsQuery.data || [], query);
    if (exactCodeMatch.status === 'matched') {
      const submitted = handleQuickAddSubmit(raw);
      if (submitted) pos.setSearch('');
      return submitted;
    }

    // Also check if typed in Arabic keyboard
    const remappedQuery = remapArabicKeyboardToEnglish(query);
    if (remappedQuery !== query) {
      const remappedLocalMatch = matchProductByCode(pos.productsQuery.data || [], remappedQuery);
      if (remappedLocalMatch.status === 'matched') {
        const submitted = handleQuickAddSubmit(remappedQuery);
        if (submitted) {
          pos.setSearch('');
          return submitted;
        }
      }
    }

    if (exactCodeMatch.status === 'ambiguous') {
      pos.setSubmitMessage('هذا الباركود غير واضح أو مرتبط بأكثر من نتيجة. راجع الصنف أو الوحدة أولًا.');
      focusBarcodeEntry();
      return false;
    }

    if (exactCodeMatch.status === 'not-found') {
      const weightedBarcode = parseWeightedBarcode(query, pos.settingsQuery.data || null);
      if (weightedBarcode) {
        // Only submit locally if we are SURE it's in the cache. Otherwise fallback to remote so we don't flash a false error message.
        const localWeightedMatch = matchProductByWeightedCode(pos.productsQuery.data || [], weightedBarcode.productCode);
        if (localWeightedMatch.status === 'matched') {
          const submitted = handleQuickAddSubmit(raw);
          if (submitted) {
            pos.setSearch('');
            return true;
          }
        }
      }
    }

    if (exactCodeMatch.status === 'not-found' && isLikelyBarcodeQuery(query)) {
      resolveRemoteBarcodeMatch(raw);
      return true;
    }

    const firstProduct = pos.filteredSaleProducts[0];
    if (!firstProduct) {
      // Before showing not-found, check invoice
      void (async () => {
        const isInvoice = await resolveScannedInvoice(query);
        if (!isInvoice) {
          pos.setSubmitMessage('لا توجد نتيجة مطابقة الآن لإضافتها.');
          focusBarcodeEntry();
        }
      })();
      return true;
    }
    pos.handleAddProduct(firstProduct, undefined, { quantity: requestedQuantity });
    pos.setSearch('');
    return true;
  }, [focusBarcodeEntry, handleQuickAddSubmit, pos, resolveRemoteBarcodeMatch, resolveScannedInvoice]);

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
      if (pos.settingsQuery.data?.posKitchenPrinterEnabled && pos.settingsQuery.data?.posKitchenPrinterAuto) {
        try {
          pos.printKitchenNow();
        } catch (e) {
          console.error('Failed to auto-print KOT', e);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.canShowLastSaleActions, pos.lastSale, pos.settingsQuery.data?.posKitchenPrinterEnabled, pos.settingsQuery.data?.posKitchenPrinterAuto]);

  usePosWorkspaceKeyboardShortcuts({
    pos,
    focusBarcodeEntry,
    onOpenNewProduct: () => handleOpenNewProduct(),
    onOpenQuickService: () => setQuickServiceOpen(true),
    printCurrentDraft,
    onRequestClearCart: requestClearCart,
    onRequestLineDelete: requestLineDelete,
    onRequestCheckout: requestCheckoutDialog,
    onOpenHeldDrafts: () => setHeldDraftsDialogOpen(true),
    onRecallHeldDraftByIndex: requestRecallHeldDraftByIndex,
  });

  return (
    <div className={`page-stack page-shell pos-workspace pos-premium-shell pos-sale-mode-${posMode}`.trim()}>
      <PosWorkspaceHeader
        pos={pos}
        posMode={posMode}
        onModeChange={setPosMode}
        onFocusSearch={focusBarcodeEntry}
        onOpenNewProduct={() => handleOpenNewProduct()}
        onOpenQuickService={() => setQuickServiceOpen(true)}
        onPrintDraft={printCurrentDraft}
        onRequestOpenShift={() => setOpenShiftModalOpen(true)}
        onOpenSerialLookup={() => setSerialLookupOpen(true)}
      />

      <PosWorkspaceMainContent
        pos={pos}
        posMode={posMode}
        catalogsLoading={catalogsLoading}
        catalogsError={catalogsError}
        allowNegativeStockSales={allowNegativeStockSales}
        searchInputRef={searchInputRef}
        cartQtySummaries={cartQtySummaries}
        cartItemsCount={cartItemsCount}
        onSubmitFirstSearchResult={submitFirstSearchResult}
        onRequestDiscountAuthorization={requestDiscountAuthorization}
        onRequestLineDelete={requestLineDelete}
        onItemModifiersClick={requestItemModifiers}
        onRequestSelectedLineDelete={requestSelectedLineDelete}
        onRequestHeldDelete={requestHeldDelete}
        onRequestClearHeldDrafts={requestClearHeldDrafts}
        onRequestClearCart={requestClearCart}
        onRequestCheckout={requestCheckoutDialog}
        heldDraftsCount={pos.heldDraftSummaries.length}
        onOpenHeldDrafts={() => setHeldDraftsDialogOpen(true)}
        onPrintCurrentDraft={printCurrentDraft}
        onFocusBarcodeEntry={focusBarcodeEntry}
        onRequestOpenShift={() => setOpenShiftModalOpen(true)}
        onOpenNewProduct={handleOpenNewProduct}
        onPriceTypeChange={handlePriceTypeChange}
      />

      <PosCheckoutDialog
        open={checkoutDialogOpen}
        pos={pos}
        selectedCustomerName={selectedCustomerName}
        onClose={() => setCheckoutDialogOpen(false)}
        onConfirmSale={(managerPin) => {
          setCheckoutDialogOpen(false);
          void pos.handleSubmit({ managerPin });
        }}
      />

      <PosWorkspaceDiscountDialog
        open={discountApprovalDialogOpen}
        pos={pos}
        onClose={() => setDiscountApprovalDialogOpen(false)}
        onFocusBarcodeEntry={focusBarcodeEntry}
      />

      <PosWorkspaceWholesaleDialog
        open={wholesaleApprovalDialogOpen}
        pos={pos}
        onClose={() => setWholesaleApprovalDialogOpen(false)}
        onFocusBarcodeEntry={focusBarcodeEntry}
      />

      <PosHeldDraftsDialog
        open={heldDraftsDialogOpen}
        heldDrafts={pos.heldDraftSummaries}
        requestedRecallDraftId={shortcutRecallDraftId}
        onRequestedRecallHandled={() => setShortcutRecallDraftId('')}
        onClose={() => {
          setHeldDraftsDialogOpen(false);
          setShortcutRecallDraftId('');
        }}
        onRecall={async (draftId) => { 
          if (pos.cart.length > 0) {
            await pos.holdDraft();
          }
          await pos.recallDraft(draftId); 
        }}
        onDelete={async (draftId) => { await pos.deleteDraft(draftId); }}
        onClearAll={async () => { await pos.clearHeldDrafts(); }}
        settings={pos.settingsQuery.data}
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
        onPrintKitchen={pos.printKitchenNow}
        onPrintBoth={pos.printBothNow}
      />

      <PosDraftSwitcherOverlay
        drafts={pos.heldDraftSummaries}
        onRecall={requestRecallHeldDraftByIndex}
      />

      <PosItemModifiersModal
        open={Boolean(modifiersModalLineKey)}
        onClose={() => setModifiersModalLineKey('')}
        item={pos.cart.find((item) => item.lineKey === modifiersModalLineKey) || null}
        onSave={(modifiers) => {
          if (modifiersModalLineKey) {
            pos.setItemModifiers(modifiersModalLineKey, modifiers);
          }
        }}
      />

      <PosOpenShiftModal
        open={openShiftModalOpen}
        onClose={() => setOpenShiftModalOpen(false)}
        branches={pos.branchesQuery.data || []}
        locations={pos.locationsQuery.data || []}
        defaultBranchId={pos.branchId}
        defaultLocationId={pos.locationId}
        onShiftOpened={() => {
          void pos.refetchCatalogs();
        }}
      />

      <SerialLookupModal
        open={serialLookupOpen}
        onClose={() => {
          setSerialLookupOpen(false);
          focusBarcodeEntry();
        }}
      />

      {quickServiceOpen && (
        <QuickProductModal
          isOpen={quickServiceOpen}
          onClose={() => setQuickServiceOpen(false)}
          itemType="service"
          onSuccess={(newServiceProduct) => {
            pos.handleAddProduct(newServiceProduct);
            focusBarcodeEntry();
          }}
        />
      )}

      {newProductModalOpen && (
        <PosNewProductModal
          isOpen={newProductModalOpen}
          onClose={() => {
            setNewProductModalOpen(false);
            focusBarcodeEntry();
          }}
          initialName={newProductInitialName}
          initialBarcode={newProductInitialBarcode}
          onSuccess={(newProduct) => {
            setNewProductModalOpen(false);
            pos.handleAddProduct(newProduct);
            pos.setSearch('');
            focusBarcodeEntry();
          }}
        />
      )}

      <PosScannedInvoiceModal
        sale={scannedSale}
        isOpen={scannedSaleModalOpen}
        onClose={() => {
          setScannedSaleModalOpen(false);
          setScannedSale(null);
          focusBarcodeEntry();
        }}
        settings={pos.settingsQuery.data}
        onOpenReturns={(targetSale) => {
          setScannedSaleModalOpen(false);
          setScannedSale(null);
          navigate(`/returns?invoiceId=${targetSale.id}&docNo=${encodeURIComponent(targetSale.docNo || '')}`);
        }}
      />
    </div>
  );
}
