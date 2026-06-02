import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { PosCartPanel } from '@/features/pos/components/PosCartPanel';
import { PosProductsPanel } from '@/features/pos/components/PosProductsPanel';
import { PosWorkspaceDock } from '@/features/pos/components/pos-workspace/PosWorkspaceDock';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import type { RefObject } from 'react';

interface PosWorkspaceMainContentProps {
  pos: PosWorkspaceState;
  posMode: PosSaleMode;
  catalogsLoading: boolean;
  catalogsError: unknown;
  allowNegativeStockSales: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  cartPiecesCount: number;
  cartItemsCount: number;
  onSubmitFirstSearchResult: (rawQuery?: string) => boolean;
  onRequestDiscountAuthorization: () => void;
  onRequestLineDelete: (lineKey: string) => void;
  onRequestSelectedLineDelete: () => void;
  onRequestHeldDelete: (draftId: string) => void;
  onRequestClearHeldDrafts: () => void;
  onRequestClearCart: () => void;
  onRequestCheckout: () => void;
  heldDraftsCount: number;
  onOpenHeldDrafts: () => void;
  onPrintCurrentDraft: () => void;
  onFocusBarcodeEntry: () => void;
}

export function PosWorkspaceMainContent({
  pos,
  posMode,
  catalogsLoading,
  catalogsError,
  allowNegativeStockSales,
  searchInputRef,
  cartPiecesCount,
  cartItemsCount,
  onSubmitFirstSearchResult,
  onRequestDiscountAuthorization,
  onRequestLineDelete,
  onRequestSelectedLineDelete,
  onRequestHeldDelete,
  onRequestClearHeldDrafts,
  onRequestClearCart,
  onRequestCheckout,
  heldDraftsCount,
  onOpenHeldDrafts,
  onPrintCurrentDraft,
  onFocusBarcodeEntry,
}: PosWorkspaceMainContentProps) {
  return (
    <QueryFeedback
      isLoading={catalogsLoading}
      isError={Boolean(catalogsError)}
      error={catalogsError}
      loadingText="جارٍ تحميل بيانات الكاشير..."
      errorTitle="تعذر تحميل بيانات الكاشير"
      errorHint="تحقق من الاتصال ثم أعد المحاولة."
      errorAction={<Button variant="secondary" onClick={() => { void pos.refetchCatalogs(); }}>إعادة المحاولة</Button>}
    >
      <div className="pos-grid-premium">
        <PosProductsPanel
          search={pos.search}
          onSearchChange={pos.setSearch}
          onSearchSubmitFirstResult={onSubmitFirstSearchResult}
          priceType={pos.priceType}
          onPriceTypeChange={pos.setPriceType}
          products={pos.filteredSaleProducts}
          recentProducts={pos.recentProducts}
          productFilter={pos.productFilter}
          onProductFilterChange={pos.setProductFilter}
          onAddProduct={pos.handleAddProduct}
          searchInputRef={searchInputRef}
          posMode={posMode}
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
            transferAmount={pos.transferAmount}
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
            allowNegativeStockSales={allowNegativeStockSales}
            canSubmitSale={pos.canSubmitSale}
            canSubmitHint={pos.canSubmitHint}
            lastAddedLineKey={pos.lastAddedLineKey}
            selectedLineKey={pos.selectedLineKey}
            posMode={posMode}
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
            onTransferAmountChange={pos.setTransferAmount}
            onDiscountChange={pos.setDiscount}
            onRequestDiscountAuthorization={onRequestDiscountAuthorization}
            onNoteChange={pos.setNote}
            onQtyChange={pos.setQty}
            onRemoveItem={onRequestLineDelete}
            onSelectLine={pos.selectCartLine}
            onFillPaidAmount={pos.fillPaidAmount}
            onChangeSelectedQty={pos.changeSelectedQty}
            onEditSelectedQty={pos.editSelectedQty}
            onRemoveSelectedItem={onRequestSelectedLineDelete}
            onHoldDraft={pos.holdDraft}
            onRecallDraft={pos.recallDraft}
            onDeleteDraft={onRequestHeldDelete}
            onClearHeldDrafts={onRequestClearHeldDrafts}
            onResetDraft={onRequestClearCart}
            onPrintPreview={onPrintCurrentDraft}
            onReprintLastSale={pos.reprintLastSale}
            onPrintReceiptNow={pos.printReceiptNow}
            onPrintA4Now={pos.printA4Now}
            onExportPdfNow={pos.exportPdfNow}
            onExportHeldDrafts={pos.exportHeldDrafts}
            showPaymentSection={false}
            showMetaSection={false}
            showHeldDraftsInline={false}
            onSubmit={onRequestCheckout}
          />

          <PosWorkspaceDock
            piecesCount={cartPiecesCount}
            itemsCount={cartItemsCount}
            total={pos.totals.total}
            canOpenCheckout={pos.canOpenCheckout}
            checkoutDisabledReason={pos.createSale.isPending ? 'جاري تنفيذ البيع' : pos.checkoutDisabledReason}
            isPending={pos.createSale.isPending}
            heldDraftsCount={heldDraftsCount}
            onFocusSearch={onFocusBarcodeEntry}
            onPrintPreview={onPrintCurrentDraft}
            onResetDraft={onRequestClearCart}
            onHoldDraft={() => { void pos.holdDraft(); }}
            onOpenHeldDrafts={onOpenHeldDrafts}
            onSubmit={onRequestCheckout}
          />
        </div>
      </div>
    </QueryFeedback>
  );
}
