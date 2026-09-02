import { useState } from 'react';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { PosCartPanel } from '@/features/pos/components/PosCartPanel';
import { PosProductsPanel } from '@/features/pos/components/PosProductsPanel';
import { PosWorkspaceDock } from '@/features/pos/components/pos-workspace/PosWorkspaceDock';
import { PosWorkspaceStartupIssues } from '@/features/pos/components/pos-workspace/PosWorkspaceStatusCards';
import { useSplitter } from '@/shared/hooks/useSplitter';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { RefObject } from 'react';

interface PosWorkspaceMainContentProps {
  pos: PosWorkspaceState;
  posMode: PosSaleMode;
  catalogsLoading: boolean;
  catalogsError: unknown;
  allowNegativeStockSales: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  cartQtySummaries: string[];
  cartItemsCount: number;
  onSubmitFirstSearchResult: (rawQuery?: string) => boolean;
  onRequestDiscountAuthorization: () => void;
  onRequestLineDelete: (lineKey: string) => void;
  onItemModifiersClick: (lineKey: string) => void;
  onEditProduct?: (productId: string) => void;
  onRequestSelectedLineDelete: () => void;
  onRequestHeldDelete: (draftId: string) => void;
  onRequestClearHeldDrafts: () => void;
  onRequestClearCart: () => void;
  onRequestCheckout: () => void;
  heldDraftsCount: number;
  onOpenHeldDrafts: () => void;
  onPrintCurrentDraft: () => void;
  onFocusBarcodeEntry: () => void;
  onRequestOpenShift?: () => void;
  onOpenNewProduct?: (params?: { name?: string; barcode?: string }) => void;
  onPriceTypeChange?: (value: PosPriceType) => void;
}

export function PosWorkspaceMainContent({
  pos,
  posMode,
  catalogsLoading,
  catalogsError,
  allowNegativeStockSales,
  searchInputRef,
  cartQtySummaries,
  cartItemsCount,
  onSubmitFirstSearchResult,
  onRequestDiscountAuthorization,
  onRequestLineDelete,
  onItemModifiersClick,
  onEditProduct,
  onRequestSelectedLineDelete,
  onRequestHeldDelete,
  onRequestClearHeldDrafts,
  onRequestClearCart,
  onRequestCheckout,
  heldDraftsCount,
  onOpenHeldDrafts,
  onPrintCurrentDraft,
  onFocusBarcodeEntry,
  onRequestOpenShift,
  onOpenNewProduct,
  onPriceTypeChange,
}: PosWorkspaceMainContentProps) {
  const user = useAuthStore((state) => state.user);
  const [mobileActiveTab, setMobileActiveTab] = useState<'products' | 'cart'>('products');
  const [isFloatingCartExpanded, setIsFloatingCartExpanded] = useState(false);
  const defaultLeft = posMode === 'scanner' ? 75 : 65;
  const { leftRatio, rightRatio, startDrag } = useSplitter(`pos_split_${posMode}_${user?.id || 'default'}`, defaultLeft);

  // CSS grid with direction:rtl renders Col1 on the RIGHT, Col2 on the LEFT.
  // leftRatio = percentage from the left edge of the grid = width of the LEFT panel (Col2).
  // rightRatio = width of the RIGHT panel (Col1).
  const gridStyle = {
    '--pos-grid-cols': `minmax(0, ${rightRatio}fr) minmax(0, ${leftRatio}fr)`,
  } as React.CSSProperties;

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
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile Tab Switcher */}
        <div className="pos-mobile-tab-switcher">
          <button
            type="button"
            className={`pos-mobile-tab-btn ${mobileActiveTab === 'products' ? 'is-active' : ''}`}
            onClick={() => setMobileActiveTab('products')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
            </svg>
            <span>الأصناف ({pos.filteredSaleProducts.length})</span>
          </button>

          <button
            type="button"
            className={`pos-mobile-tab-btn ${mobileActiveTab === 'cart' ? 'is-active' : ''}`}
            onClick={() => setMobileActiveTab('cart')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>السلة ({cartItemsCount})</span>
            {pos.totals.total > 0 && <span className="pos-mobile-tab-total">{formatCurrency(pos.totals.total)}</span>}
          </button>
        </div>

        <div className={`pos-grid-premium ${mobileActiveTab === 'products' ? 'pos-mobile-show-products' : 'pos-mobile-show-cart'}`} style={gridStyle}>

          {/* Products column: startup issues banner + products panel stacked */}
          <div className={`pos-products-column ${mobileActiveTab === 'products' ? 'is-mobile-active' : 'is-mobile-hidden'}`} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', overflow: 'hidden', flex: 1 }}>
            <PosWorkspaceStartupIssues pos={pos} onRequestOpenShift={onRequestOpenShift} />
            <PosProductsPanel
            search={pos.search}
            onSearchChange={pos.setSearch}
            onSearchSubmitFirstResult={onSubmitFirstSearchResult}
            priceType={pos.priceType}
            onPriceTypeChange={onPriceTypeChange || pos.setPriceType}
            products={pos.filteredSaleProducts}
            recentProducts={pos.recentProducts}
            productFilter={pos.productFilter}
            onProductFilterChange={pos.setProductFilter}
            onAddProduct={(prod) => {
              pos.handleAddProduct(prod);
            }}
            searchInputRef={searchInputRef}
            posMode={posMode}
            onOpenNewProduct={onOpenNewProduct}
          />
          </div>

        <div className={`pos-checkout-column ${mobileActiveTab === 'cart' ? 'is-mobile-active' : 'is-mobile-hidden'}`}>
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
            deliveryFee={pos.deliveryFee}
            note={pos.note}
            tableNumber={pos.tableNumber}
            orderType={pos.orderType}
            submitMessage={pos.submitMessage}
            lastSaleDocNo={pos.lastSale?.docNo || pos.lastSale?.id || ''}
            canShowLastSaleActions={pos.canShowLastSaleActions}
            quickCustomerName={pos.quickCustomerName}
            quickCustomerPhone={pos.quickCustomerPhone}
            quickCustomerAddress={pos.quickCustomerAddress}
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
            settings={pos.settingsQuery.data}
            onCustomerChange={pos.setCustomerId}
            onTableNumberChange={pos.setTableNumber}
            onOrderTypeChange={pos.setOrderType}
            onQuickCustomerNameChange={pos.setQuickCustomerName}
            onQuickCustomerPhoneChange={pos.setQuickCustomerPhone}
            onQuickCustomerAddressChange={pos.setQuickCustomerAddress}
            onQuickCustomerSubmit={pos.handleQuickCustomerSubmit}
            onPaymentTypeChange={pos.setPaymentType}
            onPaymentPresetChange={pos.setPaymentPreset}
            onCashAmountChange={pos.setCashAmount}
            onCardAmountChange={pos.setCardAmount}
            onTransferAmountChange={pos.setTransferAmount}
            onDiscountChange={pos.setDiscount}
            onDeliveryFeeChange={pos.setDeliveryFee}
            onRequestDiscountAuthorization={onRequestDiscountAuthorization}
            onNoteChange={pos.setNote}
            onQtyChange={pos.setQty}
            onItemNoteChange={pos.setItemNote}
            onItemModifiersClick={onItemModifiersClick}
            onEditProduct={onEditProduct}
            onRemoveItem={onRequestLineDelete}
            onSelectLine={pos.selectCartLine}
            onFillPaidAmount={pos.fillPaidAmount}
            onChangeSelectedQty={pos.changeSelectedQty}
            onChangeLineQtyByDelta={pos.changeLineQtyByDelta}
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
            showMetaSection={pos.settingsQuery.data?.posShowCartMeta === true}
            showHeldDraftsInline={false}
            onSubmit={onRequestCheckout}
          />

          <PosWorkspaceDock
            qtySummaries={cartQtySummaries}
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
            onSubmit={() => onRequestCheckout()}
            settings={pos.settingsQuery.data}
          />
        </div>
        </div>

        {/* Resizer handle — positioned absolutely over the gap between the two columns */}
        <div
          className="pos-resizer-handle"
          onPointerDown={startDrag}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `calc(${leftRatio}% - 12px)`,
            width: '24px',
            cursor: 'col-resize',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="اسحب لتعديل مقاس الشاشة"
        >
          <div style={{ width: '4px', height: '40px', background: 'rgba(15, 23, 42, 0.15)', borderRadius: '8px' }} />
        </div>

        {/* Mobile Sticky Floating Cart Bar (visible when on products tab and cart has items) */}
        {mobileActiveTab === 'products' && cartItemsCount > 0 && (
          <div className={`pos-mobile-floating-cart-bar ${isFloatingCartExpanded ? 'is-expanded' : ''}`}>
            {/* Header / Drawer Handle with Toggle Button */}
            <div className="pos-mobile-floating-cart-header">
              <button
                type="button"
                className="pos-mobile-floating-cart-toggle-btn"
                onClick={() => setIsFloatingCartExpanded((prev) => !prev)}
                aria-label={isFloatingCartExpanded ? 'تصغير قائمة الأصناف' : 'عرض أصناف السلة'}
                title={isFloatingCartExpanded ? 'تصغير' : 'عرض الأصناف'}
              >
                <div className="pos-mobile-floating-cart-badge">{cartItemsCount}</div>
                <div className="pos-mobile-floating-cart-text">
                  <div className="pos-mobile-floating-cart-text-row">
                    <strong className="pos-mobile-floating-cart-total">{formatCurrency(pos.totals.total)}</strong>
                    <span className="pos-mobile-floating-cart-unit">ج.م</span>
                  </div>
                  <span className="pos-mobile-floating-cart-sub">
                    {isFloatingCartExpanded ? 'أصناف السلة (انقر للإغلاق)' : `${cartItemsCount} صنف بالسلة • اضغط لمعاينة الأصناف`}
                  </span>
                </div>
                <span className="pos-mobile-floating-cart-chevron">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isFloatingCartExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.22s ease',
                    }}
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </span>
              </button>

              <div className="pos-mobile-floating-cart-actions">
                <button
                  type="button"
                  className="pos-mobile-floating-checkout-btn"
                  onClick={() => {
                    if (pos.canOpenCheckout) {
                      onRequestCheckout();
                    } else {
                      setMobileActiveTab('cart');
                    }
                  }}
                >
                  <span>الدفع (F10)</span>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded Compact Items Preview */}
            {isFloatingCartExpanded && (
              <div className="pos-mobile-floating-cart-items-drawer">
                <div className="pos-mobile-floating-cart-items-list">
                  {pos.cart.map((item, idx) => {
                    const modifiersTotal = (item.modifiers || []).reduce((sum, mod) => sum + Number(mod.price || 0), 0);
                    const lineTotal = Number(item.qty || 0) * (Number(item.price || 0) + modifiersTotal);
                    return (
                      <div key={item.lineKey || idx} className="pos-mobile-floating-cart-item-row">
                        <div className="pos-mobile-floating-cart-item-name-col">
                          <strong className="pos-mobile-floating-cart-item-name">{item.name}</strong>
                          <span className="pos-mobile-floating-cart-item-price-each">{formatCurrency(item.price)} ج.م / للوحدة</span>
                        </div>

                        <div className="pos-mobile-floating-cart-item-qty-col">
                          <button
                            type="button"
                            className="pos-mobile-floating-qty-btn"
                            onClick={() => pos.changeLineQtyByDelta(item.lineKey, -1)}
                            aria-label="تقليل الكمية"
                          >
                            -
                          </button>
                          <span className="pos-mobile-floating-qty-val">{item.qty}</span>
                          <button
                            type="button"
                            className="pos-mobile-floating-qty-btn"
                            onClick={() => pos.changeLineQtyByDelta(item.lineKey, 1)}
                            aria-label="زيادة الكمية"
                          >
                            +
                          </button>
                        </div>

                        <div className="pos-mobile-floating-cart-item-total-col">
                          <strong>{formatCurrency(lineTotal)}</strong>
                          <span className="pos-mobile-floating-cart-unit-small">ج.م</span>
                        </div>

                        <button
                          type="button"
                          className="pos-mobile-floating-item-delete-btn"
                          onClick={() => onRequestLineDelete(item.lineKey)}
                          title="حذف الصنف"
                          aria-label="حذف"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="pos-mobile-floating-cart-drawer-footer">
                  <button
                    type="button"
                    className="pos-mobile-floating-view-full-cart-link"
                    onClick={() => setMobileActiveTab('cart')}
                  >
                    عرض صفحة السلة الكاملة والملاحظات ←
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </QueryFeedback>
  );
}
