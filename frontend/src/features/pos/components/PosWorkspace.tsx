import { useCallback, useEffect, useMemo, useRef } from 'react';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
import { Button } from '@/components/ui/Button';
import { PosCartPanel } from '@/features/pos/components/PosCartPanel';
import { PosProductsPanel } from '@/features/pos/components/PosProductsPanel';
import { PosWorkspaceHeader } from '@/features/pos/components/pos-workspace/PosWorkspaceHeader';
import { PosWorkspaceQuickShortcuts } from '@/features/pos/components/pos-workspace/PosWorkspaceStatusCards';
import {
  getSelectedCustomerName,
  printCurrentPosDraft,
} from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import { usePosWorkspace } from '@/features/pos/hooks/usePosWorkspace';

export function PosWorkspace() {
  const pos = usePosWorkspace();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const quickAddInputRef = useRef<HTMLInputElement | null>(null);

  const catalogsLoading = pos.productsQuery.isLoading || pos.customersQuery.isLoading || pos.branchesQuery.isLoading || pos.locationsQuery.isLoading || pos.settingsQuery.isLoading;
  const catalogsError = pos.productsQuery.error || pos.customersQuery.error || pos.branchesQuery.error || pos.locationsQuery.error || pos.settingsQuery.error;

  const selectedCustomerName = useMemo(() => getSelectedCustomerName(pos), [pos]);

  const printCurrentDraft = useCallback(() => {
    printCurrentPosDraft(pos, selectedCustomerName);
  }, [pos, selectedCustomerName]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));

      if (event.key === 'F2') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (event.key === 'F3') {
        event.preventDefault();
        quickAddInputRef.current?.focus();
        quickAddInputRef.current?.select();
        return;
      }
      if (isTypingTarget && !['F4', 'F6', 'F8', 'F9', 'Escape'].includes(event.key)) return;
      if (event.key === 'F4') {
        event.preventDefault();
        pos.holdDraft();
      } else if (event.key === 'F6') {
        event.preventDefault();
        pos.reprintLastSale();
      } else if (event.key === 'F8') {
        event.preventDefault();
        printCurrentDraft();
      } else if (event.key === 'F9') {
        event.preventDefault();
        void pos.handleSubmit();
      } else if (event.key === 'Escape' && pos.cart.length) {
        event.preventDefault();
        pos.resetPosDraft();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [pos, printCurrentDraft, selectedCustomerName]);

  return (
    <div className="page-stack page-shell pos-workspace pos-premium-shell">
      <PosWorkspaceHeader pos={pos} />

      <QueryFeedback
        isLoading={catalogsLoading}
        isError={Boolean(catalogsError)}
        error={catalogsError}
        loadingText="جاري تحميل بيانات الكاشير..."
        errorTitle="تعذر تحميل بيانات الكاشير"
        errorHint="تحقق من الاتصال ثم أعد المحاولة."
        errorAction={<Button variant="secondary" onClick={() => { void pos.refetchCatalogs(); }}>إعادة المحاولة</Button>}
      >
        <PosWorkspaceQuickShortcuts />

        <div className="pos-grid-premium">
          <PosProductsPanel
            search={pos.search}
            onSearchChange={pos.setSearch}
            priceType={pos.priceType}
            onPriceTypeChange={pos.setPriceType}
            products={pos.filteredSaleProducts}
            recentProducts={pos.recentProducts}
            contextBadges={pos.contextBadges}
            productFilter={pos.productFilter}
            onProductFilterChange={pos.setProductFilter}
            onAddProduct={pos.handleAddProduct}
            quickAddCode={pos.quickAddCode}
            onQuickAddCodeChange={pos.setQuickAddCode}
            onQuickAddCodeSubmit={pos.handleQuickAddCodeSubmit}
            scannerMessage={pos.scannerMessage}
            searchInputRef={searchInputRef}
            quickAddInputRef={quickAddInputRef}
          />

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
            canShowLastSaleActions={Boolean(pos.lastSale && pos.submitMessage && !pos.createSale.isError)}
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
            canSubmitSale={pos.canSubmitSale}
            canSubmitHint={pos.canSubmitHint}
            lastAddedLineKey={pos.lastAddedLineKey}
            onCustomerChange={pos.setCustomerId}
            onQuickCustomerNameChange={pos.setQuickCustomerName}
            onQuickCustomerPhoneChange={pos.setQuickCustomerPhone}
            onQuickCustomerSubmit={pos.handleQuickCustomerSubmit}
            onBranchChange={pos.setBranchId}
            onLocationChange={pos.setLocationId}
            onPaymentTypeChange={pos.setPaymentType}
            onCashAmountChange={pos.setCashAmount}
            onCardAmountChange={pos.setCardAmount}
            onDiscountChange={pos.setDiscount}
            onNoteChange={pos.setNote}
            onQtyChange={pos.setQty}
            onRemoveItem={pos.removeItem}
            onFillPaidAmount={pos.fillPaidAmount}
            onHoldDraft={pos.holdDraft}
            onRecallDraft={pos.recallDraft}
            onDeleteDraft={pos.deleteDraft}
            onClearHeldDrafts={pos.clearHeldDrafts}
            onResetDraft={pos.resetPosDraft}
            onPrintPreview={printCurrentDraft}
            onReprintLastSale={pos.reprintLastSale}
            onCopyLastSaleSummary={pos.copyLastSaleSummary}
            onExportHeldDrafts={pos.exportHeldDrafts}
            onSubmit={() => void pos.handleSubmit()}
          />
        </div>
      </QueryFeedback>
    </div>
  );
}
