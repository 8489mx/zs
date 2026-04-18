import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PosCartPanel } from '@/features/pos/components/PosCartPanel';
import { PosProductsPanel } from '@/features/pos/components/PosProductsPanel';
import { PosWorkspaceHeader } from '@/features/pos/components/pos-workspace/PosWorkspaceHeader';
import { PosWorkspaceDock } from '@/features/pos/components/pos-workspace/PosWorkspaceDock';
import { PosWorkspaceStartupIssues } from '@/features/pos/components/pos-workspace/PosWorkspaceStatusCards';
import {
  getSelectedCustomerName,
  printCurrentPosDraft,
} from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import { matchProductByCode, paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import { usePosWorkspace } from '@/features/pos/hooks/usePosWorkspace';

export function PosWorkspace() {
  const pos = usePosWorkspace();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannerSubmitRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [discountApprovalDialogOpen, setDiscountApprovalDialogOpen] = useState(false);

  const catalogsLoading = pos.productsQuery.isLoading || pos.customersQuery.isLoading || pos.branchesQuery.isLoading || pos.locationsQuery.isLoading || pos.settingsQuery.isLoading;
  const catalogsError = pos.productsQuery.error || pos.customersQuery.error || pos.branchesQuery.error || pos.locationsQuery.error || pos.settingsQuery.error;

  const selectedCustomerName = useMemo(() => getSelectedCustomerName(pos), [pos]);
  const paymentModeLabel = useMemo(() => paymentLabel(pos.paymentType, pos.paymentChannel), [pos.paymentChannel, pos.paymentType]);
  const cartPiecesCount = useMemo(() => pos.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [pos.cart]);

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

    const firstProduct = pos.filteredSaleProducts[0];
    if (!firstProduct) {
      pos.setSubmitMessage('لا توجد نتيجة مطابقة الآن لإضافتها.');
      focusBarcodeEntry();
      return false;
    }
    pos.handleAddProduct(firstProduct);
    pos.setSearch('');
    return true;
  }, [focusBarcodeEntry, handleQuickAddSubmit, pos]);

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
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));

      if (event.key === 'F3') {
        event.preventDefault();
        focusBarcodeEntry();
        return;
      }
      if (isTypingTarget && !['F2', 'F4', 'F6', 'F8', 'F12', 'Escape'].includes(event.key)) return;
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
          pos.removeSelectedItem();
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
          void pos.handleSubmit({ fastCash: true });
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
      } else if (event.key === 'F12') {
        event.preventDefault();
        if (pos.canShowLastSaleActions) pos.printA4Now();
      } else if (event.key === 'Escape' && pos.cart.length) {
        event.preventDefault();
        pos.resetPosDraft();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [focusBarcodeEntry, pos, printCurrentDraft]);

  return (
    <div className="page-stack page-shell pos-workspace pos-premium-shell">
      <PosWorkspaceHeader pos={pos} onFocusSearch={focusBarcodeEntry} onPrintDraft={printCurrentDraft} />

      <QueryFeedback
        isLoading={catalogsLoading}
        isError={Boolean(catalogsError)}
        error={catalogsError}
        loadingText="جاري تحميل بيانات الكاشير..."
        errorTitle="تعذر تحميل بيانات الكاشير"
        errorHint="تحقق من الاتصال ثم أعد المحاولة."
        errorAction={<Button variant="secondary" onClick={() => { void pos.refetchCatalogs(); }}>إعادة المحاولة</Button>}
      >
        <PosWorkspaceStartupIssues pos={pos} />

        <div className="pos-grid-premium">
          <PosProductsPanel
            search={pos.search}
            onSearchChange={pos.setSearch}
            onSearchSubmitFirstResult={submitFirstSearchResult}
            priceType={pos.priceType}
            onPriceTypeChange={pos.setPriceType}
            products={pos.filteredSaleProducts}
            recentProducts={pos.recentProducts}
            productFilter={pos.productFilter}
            onProductFilterChange={pos.setProductFilter}
            onAddProduct={pos.handleAddProduct}
            searchInputRef={searchInputRef}
          />

          <div className="pos-checkout-column">
            <PosCartPanel
              cart={pos.cart}
              customers={pos.customersQuery.data || []}
              branches={pos.branchesQuery.data || []}
              locations={pos.locationsQuery.data || []}
              customerId={pos.customerId}
              branchId={pos.branchId}
              locationId={pos.locationId}
              paymentType={pos.paymentType}
              paymentChannel={pos.paymentChannel}
              paidAmount={pos.paidAmount}
              cashAmount={pos.cashAmount}
              cardAmount={pos.cardAmount}
              discount={pos.discount}
              note={pos.note}
              submitMessage={pos.submitMessage}
              lastSaleDocNo={pos.lastSale?.docNo || pos.lastSale?.id || ''}
              canShowLastSaleActions={pos.canShowLastSaleActions}
              quickCustomerName={pos.quickCustomerName}
              quickCustomerPhone={pos.quickCustomerPhone}
              isQuickCustomerPending={pos.quickCustomerMutation.isPending}
              heldDrafts={pos.heldDraftSummaries}
              isError={pos.createSale.isError}
              isPending={pos.createSale.isPending}
              totals={pos.totals}
              changeAmount={pos.changeAmount}
              amountDue={pos.amountDue}
              hasOpenShift={Boolean(pos.ownOpenShift)}
              canApplyDiscount={pos.canApplyDiscount}
              discountApprovalGranted={pos.discountApprovalGranted}
              isDiscountAuthorizationPending={pos.discountAuthorizationMutation.isPending}
              hasDiscountPermissionViolation={pos.hasDiscountPermissionViolation}
              hasPricePermissionViolation={pos.hasPricePermissionViolation}
              canSubmitSale={pos.canSubmitSale}
              canSubmitHint={pos.canSubmitHint}
              lastAddedLineKey={pos.lastAddedLineKey}
              selectedLineKey={pos.selectedLineKey}
              preferredPrintPageSize={pos.settingsQuery.data?.paperSize === 'receipt' ? 'receipt' : 'a4'}
              onCustomerChange={pos.setCustomerId}
              onQuickCustomerNameChange={pos.setQuickCustomerName}
              onQuickCustomerPhoneChange={pos.setQuickCustomerPhone}
              onQuickCustomerSubmit={pos.handleQuickCustomerSubmit}
              onBranchChange={pos.setBranchId}
              onLocationChange={pos.setLocationId}
              onPaymentTypeChange={pos.setPaymentType}
              onPaymentPresetChange={pos.setPaymentPreset}
              onCashAmountChange={pos.setCashAmount}
              onCardAmountChange={pos.setCardAmount}
              onDiscountChange={pos.setDiscount}
              onRequestDiscountAuthorization={requestDiscountAuthorization}
              onNoteChange={pos.setNote}
              onQtyChange={pos.setQty}
              onRemoveItem={pos.removeItem}
              onSelectLine={pos.selectCartLine}
              onFillPaidAmount={pos.fillPaidAmount}
              onChangeSelectedQty={pos.changeSelectedQty}
              onEditSelectedQty={pos.editSelectedQty}
              onRemoveSelectedItem={pos.removeSelectedItem}
              onHoldDraft={pos.holdDraft}
              onRecallDraft={pos.recallDraft}
              onDeleteDraft={pos.deleteDraft}
              onClearHeldDrafts={pos.clearHeldDrafts}
              onResetDraft={pos.resetPosDraft}
              onPrintPreview={printCurrentDraft}
              onReprintLastSale={pos.reprintLastSale}
              onPrintReceiptNow={pos.printReceiptNow}
              onPrintA4Now={pos.printA4Now}
              onExportPdfNow={pos.exportPdfNow}
              onExportHeldDrafts={pos.exportHeldDrafts}
              onSubmit={() => void pos.handleSubmit()}
            />

            <PosWorkspaceDock
              selectedCustomerName={selectedCustomerName}
              paymentModeLabel={paymentModeLabel}
              piecesCount={cartPiecesCount}
              total={pos.totals.total}
              amountDue={pos.paymentType === 'credit' ? pos.totals.total : pos.amountDue}
              paidAmount={pos.paidAmount}
              changeAmount={pos.changeAmount}
              isCredit={pos.paymentType === 'credit'}
              canSubmitSale={pos.canSubmitSale}
              canSubmitHint={pos.canSubmitHint}
              isPending={pos.createSale.isPending}
              onFocusSearch={focusBarcodeEntry}
              onPrintPreview={printCurrentDraft}
              onResetDraft={pos.resetPosDraft}
              onHoldDraft={() => { void pos.holdDraft(); }}
              onSubmit={() => { void pos.handleSubmit(); }}
            />
          </div>
        </div>
      </QueryFeedback>

      <ActionConfirmDialog
        open={discountApprovalDialogOpen}
        title="اعتماد خصم الفاتورة"
        description="أدخل رمز المدير أو كلمة مرور حساب المدير لفتح الخصم لهذه الفاتورة فقط. سيتم قفل الخصم تلقائيًا مع أي فاتورة جديدة."
        confirmLabel="اعتماد الخصم"
        confirmVariant="primary"
        managerPinRequired
        managerPinLabel="رمز المدير أو كلمة المرور"
        managerPinHint="سيتم إخفاء القيمة أثناء الكتابة، ولن يظل الاعتماد مفتوحًا إلا للفواتير الحالية فقط."
        isBusy={Boolean(pos.discountAuthorizationMutation.isPending)}
        onCancel={() => setDiscountApprovalDialogOpen(false)}
        onConfirm={async ({ managerPin }) => {
          await pos.discountAuthorizationMutation.mutateAsync(managerPin);
          pos.setDiscountApprovalGranted(true);
          pos.setDiscountApprovalSecret(managerPin);
          pos.setSubmitMessage('تم اعتماد الخصم لهذه الفاتورة فقط.');
          setDiscountApprovalDialogOpen(false);
          focusBarcodeEntry();
        }}
      />
    </div>
  );
}
