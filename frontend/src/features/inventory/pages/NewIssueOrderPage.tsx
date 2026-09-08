import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { DraftRestoredBanner } from '@/shared/components/DraftRestoredBanner';
import { IssueOrderSuccessModal } from '../components/issue-order/IssueOrderSuccessModal';
import { IssueOrderHeaderSection } from '../components/issue-order/IssueOrderHeaderSection';
import { IssueOrderItemsTable } from '../components/issue-order/IssueOrderItemsTable';
import { IssueOrderMobileCards } from '../components/issue-order/IssueOrderMobileCards';
import { useNewIssueOrderController } from '../components/issue-order/useNewIssueOrderController';

export function NewIssueOrderPage() {
  const {
    navigate,
    user,
    fromLocationId,
    setFromLocationId,
    fromLocationQuery,
    setFromLocationQuery,
    setToLocationId,
    toLocationQuery,
    setToLocationQuery,
    recipientName,
    setRecipientName,
    note,
    setNote,
    lines,
    isSubmitting,
    isPolling,
    errorMsg,
    cameraScanLineId,
    setCameraScanLineId,
    createdTransfers,
    setCreatedTransfers,
    issueMode,
    setIssueMode,
    isDraftRestored,
    clearDraft,
    handleClearDraft,
    dismissRestoredNotice,
    products,
    locationOptions,
    branchOptions,
    stocks,
    productOptions,
    fetchProductOptions,
    addLine,
    removeLine,
    handleSelectProduct,
    handleQtyKeyDown,
    updateLine,
    handleSubmit,
    handlePrintA4,
    handlePrintReceipt,
    handleCameraScanForLine,
    resetForm,
  } = useNewIssueOrderController();

  useAppToolbar([
    { label: 'المخزون', to: '/inventory' },
    { label: 'إذن صرف جديد' },
  ]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <IssueOrderSuccessModal
        createdTransfers={createdTransfers}
        onPrintReceipt={handlePrintReceipt}
        onPrintA4={handlePrintA4}
        onNewTransfer={resetForm}
        onClose={() => {
          setCreatedTransfers([]);
          navigate('/inventory');
        }}
      />

      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader
          title="إذن صرف جديد"
          onBack={() => navigate('/inventory')}
          badge={<span className="document-prototype-status-badge is-draft">مسودة</span>}
          actions={
            <div className="document-prototype-topbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary"
                onClick={() => {
                  clearDraft();
                  navigate('/inventory');
                }}
                style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <span>إلغاء المسودة</span>
              </Button>

              <Button
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !!createdTransfers.length}
              >
                <span>{isPolling ? 'جارٍ تأكيد العملية...' : isSubmitting ? 'جارٍ الحفظ...' : 'اعتماد إذن الصرف'}</span>
              </Button>
            </div>
          }
        />

        {isDraftRestored && (
          <div style={{ padding: '0 24px', marginTop: '16px' }}>
            <DraftRestoredBanner
              show={isDraftRestored}
              onClear={handleClearDraft}
              onDismiss={dismissRestoredNotice}
            />
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '0 24px', marginTop: '16px', marginBottom: '-8px' }}>
            <div role="alert" aria-live="polite" style={{
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(248, 113, 113, 0.18)',
              color: '#b91c1c',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.5rem 0.75rem',
              width: '100%',
            }}>
              {errorMsg}
            </div>
          </div>
        )}

        <IssueOrderHeaderSection
          fromLocationQuery={fromLocationQuery}
          setFromLocationQuery={setFromLocationQuery}
          setFromLocationId={setFromLocationId}
          toLocationQuery={toLocationQuery}
          setToLocationQuery={setToLocationQuery}
          setToLocationId={setToLocationId}
          locationOptions={locationOptions}
          branchOptions={branchOptions}
          issueMode={issueMode}
          setIssueMode={setIssueMode}
          dispatcherName={user?.displayName || user?.username || ''}
          recipientName={recipientName}
          setRecipientName={setRecipientName}
        />

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">الأصناف</h3>
          <div className="document-prototype-grid">
            <IssueOrderItemsTable
              lines={lines}
              fromLocationId={fromLocationId}
              products={products}
              locationOptions={locationOptions}
              productOptions={productOptions}
              fetchProductOptions={fetchProductOptions}
              stocks={stocks}
              onSelectProduct={handleSelectProduct}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
              onQtyKeyDown={handleQtyKeyDown}
            />

            <IssueOrderMobileCards
              lines={lines}
              fromLocationId={fromLocationId}
              products={products}
              locationOptions={locationOptions}
              productOptions={productOptions}
              fetchProductOptions={fetchProductOptions}
              stocks={stocks}
              onSelectProduct={handleSelectProduct}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
              onQtyKeyDown={handleQtyKeyDown}
              onOpenScanner={(id) => setCameraScanLineId(id)}
            />

            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="purchase-prototype-add-line-btn"
                onClick={addLine}
                style={{
                  color: 'var(--primary-color)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>+</span> إضافة صنف جديد
              </button>
            </div>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">ملاحظات</h3>
          <div className="document-prototype-grid">
            <textarea
              className="purchase-prototype-field-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="أي ملاحظات إضافية على إذن الصرف..."
              style={{ minHeight: '100px', resize: 'vertical', width: '100%' }}
            />
          </div>
        </section>
      </main>

      <CameraBarcodeScannerModal
        isOpen={cameraScanLineId !== null}
        onClose={() => setCameraScanLineId(null)}
        onScan={handleCameraScanForLine}
        title="مسح باركود الصنف بكاميرا الهاتف"
      />
    </div>
  );
}

export default NewIssueOrderPage;
