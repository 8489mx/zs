import { useNewPurchaseOrderController } from '../components/new-purchase-order/useNewPurchaseOrderController';
import { PurchaseOrderHeaderSection } from '../components/new-purchase-order/PurchaseOrderHeaderSection';
import { PurchaseOrderItemsTable } from '../components/new-purchase-order/PurchaseOrderItemsTable';
import { PurchaseOrderAccountingSection } from '../components/new-purchase-order/PurchaseOrderAccountingSection';
import { PurchaseOrderSummaryCard } from '../components/new-purchase-order/PurchaseOrderSummaryCard';
import { PurchaseOrderSuccessModal } from '../components/new-purchase-order/PurchaseOrderSuccessModal';
import { BarcodeScanDialog } from '../components/new-purchase-order/BarcodeScanDialog';
import { QuickCreateDialog } from '../components/new-purchase-order/QuickCreateDialog';
import { PurchaseProductQuickCreateModal } from '../components/PurchaseProductQuickCreateModal';

export function NewPurchaseOrderPage() {
  const ctrl = useNewPurchaseOrderController();

  return (
    <div className="purchase-prototype-theme-root">
      <PurchaseOrderSuccessModal
        createdPurchase={ctrl.createdPurchase}
        rawSettings={ctrl.rawSettings}
        onNewOrder={ctrl.handleNewPurchaseOrder}
        onNavigateToList={() => ctrl.navigate('/purchases')}
        onClose={ctrl.handleNewPurchaseOrder}
      />

      <main className="document-prototype-column" style={{ paddingBottom: '32px', maxWidth: '1280px' }}>
        <PurchaseOrderHeaderSection
          documentStatus={ctrl.documentStatus}
          total={ctrl.total}
          language={ctrl.language}
          attachmentsCount={ctrl.attachments.length}
          inlineMessage={ctrl.inlineMessage}
          createMutationPending={ctrl.createMutation.isPending}
          isPolling={ctrl.isPolling}
          onNavigateBack={() => ctrl.navigate('/purchases')}
          onResetDraft={ctrl.handleResetDraft}
          onSaveDraft={ctrl.handleSaveDraft}
          onConfirmInvoice={ctrl.handleConfirmInvoice}
          supplier={ctrl.supplier}
          setSupplier={ctrl.setSupplier}
          suppliers={ctrl.suppliers}
          onSupplierSelect={ctrl.handleSupplierSelect}
          date={ctrl.date}
          setDate={ctrl.setDate}
          requiredDate={ctrl.requiredDate}
          setRequiredDate={ctrl.setRequiredDate}
          currency={ctrl.currency}
          setCurrency={ctrl.setCurrency}
          paymentType={ctrl.paymentType}
          setPaymentType={ctrl.setPaymentType}
          contact={ctrl.contact}
          setContact={ctrl.setContact}
          contactsList={ctrl.contactsList}
          onContactSelect={ctrl.handleContactSelect}
          shippingAddress={ctrl.shippingAddress}
          setShippingAddress={ctrl.setShippingAddress}
          deliveryDestinations={ctrl.deliveryDestinations}
          onOpenQuickCreate={ctrl.openQuickCreate}
          onSetQuickCreateState={ctrl.setQuickCreateState}
          validationErrors={ctrl.validationErrors}
          markDocumentDirty={ctrl.markDocumentDirty}
          clearDocumentFieldError={ctrl.clearDocumentFieldError}
          supplierInputRef={ctrl.supplierInputRef}
          dateInputRef={ctrl.dateInputRef}
          requiredDateInputRef={ctrl.requiredDateInputRef}
          currencyInputRef={ctrl.currencyInputRef}
          contactInputRef={ctrl.contactInputRef}
          shippingInputRef={ctrl.shippingInputRef}
          purchaseDropdownClassName={ctrl.purchaseDropdownClassName}
          attachments={ctrl.attachments}
          isUploading={ctrl.isUploading}
          onFileUpload={ctrl.handleFileUpload}
          onRemoveAttachment={ctrl.handleRemoveAttachment}
        />

        <PurchaseOrderItemsTable
          lines={ctrl.lines}
          categories={ctrl.categories}
          warehouses={ctrl.warehouses}
          language={ctrl.language}
          pendingFocusLineId={ctrl.pendingFocusLineId}
          activeQuickAction={ctrl.activeQuickAction}
          setActiveQuickAction={ctrl.setActiveQuickAction}
          taxRate={ctrl.taxRate}
          customTaxRate={ctrl.customTaxRate}
          setCustomTaxRate={ctrl.setCustomTaxRate}
          discountMode={ctrl.discountMode}
          setDiscountMode={ctrl.setDiscountMode}
          discount={ctrl.discount}
          setDiscount={ctrl.setDiscount}
          validationErrors={ctrl.validationErrors}
          purchaseDropdownClassName={ctrl.purchaseDropdownClassName}
          onAddLine={ctrl.addLine}
          onAddServiceLine={ctrl.addServiceLine}
          onAddProductLine={ctrl.addProductLine}
          onRemoveLine={ctrl.removeLine}
          onUpdateLine={ctrl.updateLine}
          onProductSelect={ctrl.handleProductSelect}
          onCategorySelect={ctrl.handleCategorySelect}
          onWarehouseSelect={ctrl.handleWarehouseSelect}
          onBarcodeScanAction={ctrl.handleBarcodeScanAction}
          onOpenQuickCreate={ctrl.openQuickCreate}
          fetchProductOptions={ctrl.fetchProductOptions}
          searchCategory={ctrl.searchCategory}
          applyTaxPreset={ctrl.applyTaxPreset}
          applyCustomTaxRate={ctrl.applyCustomTaxRate}
          applyDiscount={ctrl.applyDiscount}
          markDocumentDirty={ctrl.markDocumentDirty}
          setLineError={ctrl.setLineError}
          enableMobileStoreFeatures={ctrl.rawSettings?.enableMobileStoreFeatures === true}
        />

        {ctrl.rawSettings?.enableEnterpriseFeatures === true && (
          <PurchaseOrderAccountingSection
            costCenter={ctrl.costCenter}
            setCostCenter={ctrl.setCostCenter}
            costCenters={ctrl.costCenters}
            onCostCenterSelect={ctrl.handleCostCenterSelect}
            project={ctrl.project}
            setProject={ctrl.setProject}
            projects={ctrl.projects}
            onProjectSelect={ctrl.handleProjectSelect}
            termsTemplate={ctrl.termsTemplate}
            setTermsTemplate={ctrl.setTermsTemplate}
            shippingAddress={ctrl.shippingAddress}
            setShippingAddress={ctrl.setShippingAddress}
            deliveryDestinations={ctrl.deliveryDestinations}
            shippingInputRef={ctrl.shippingInputRef}
            onOpenQuickCreate={ctrl.openQuickCreate}
            onSetQuickCreateState={ctrl.setQuickCreateState}
            markDocumentDirty={ctrl.markDocumentDirty}
            costCenterInputRef={ctrl.costCenterInputRef}
            projectInputRef={ctrl.projectInputRef}
            purchaseDropdownClassName={ctrl.purchaseDropdownClassName}
          />
        )}

        <PurchaseOrderSummaryCard
          notes={ctrl.notes}
          setNotes={ctrl.setNotes}
          subtotal={ctrl.subtotal}
          tax={ctrl.tax}
          total={ctrl.total}
          language={ctrl.language}
        />
      </main>

      <BarcodeScanDialog
        open={ctrl.barcodeScanOpen}
        query={ctrl.barcodeScanQuery}
        products={ctrl.products}
        onClose={() => ctrl.setBarcodeScanOpen(false)}
        onScan={ctrl.handleBarcodeScanSubmit}
        onOpenQuickCreate={ctrl.openProductQuickCreateFromBarcode}
      />

      <PurchaseProductQuickCreateModal
        isOpen={ctrl.productCreateModalState.isOpen}
        initialName={ctrl.productCreateModalState.query}
        initialBarcode={ctrl.productCreateModalState.barcode}
        onClose={ctrl.closeProductCreateModal}
        onSuccess={ctrl.handleProductCreateSuccess}
        categories={ctrl.categories.map(c => ({ id: c.id, name: c.name }))}
        suppliers={ctrl.suppliers.map(s => ({ id: s.id, name: s.name }))}
        warehouses={ctrl.warehouses.map(w => ({ id: w.id, name: w.name }))}
      />

      <QuickCreateDialog
        state={ctrl.quickCreateState}
        onCancel={ctrl.closeQuickCreate}
        onSubmit={ctrl.handleQuickCreateSubmit}
      />
    </div>
  );
}
