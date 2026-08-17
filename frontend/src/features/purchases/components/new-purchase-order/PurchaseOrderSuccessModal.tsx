import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';

interface PurchaseOrderSuccessModalProps {
  createdPurchase: any;
  rawSettings: any;
  onNewOrder: () => void;
  onNavigateToList: () => void;
  onClose?: () => void;
}

export function PurchaseOrderSuccessModal({
  createdPurchase,
  rawSettings,
  onNewOrder,
  onNavigateToList,
  onClose,
}: PurchaseOrderSuccessModalProps) {
  if (!createdPurchase) return null;

  const handleClose = onClose || onNavigateToList;

  return (
    <DialogShell
      open={Boolean(createdPurchase)}
      onClose={handleClose}
      width="420px"
      showCloseButton={true}
      ariaLabel="تم إنشاء الفاتورة بنجاح"
    >
      <div style={{ textAlign: 'center', padding: '24px 20px 16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>تم إنشاء الفاتورة بنجاح!</h3>
        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
          رقم الفاتورة: <strong style={{ color: '#0f172a' }}>{createdPurchase?.invoiceNumber || createdPurchase?.id}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button
            type="button"
            onClick={() => {
              import('@/features/purchases/lib/purchases-workspace.helpers').then(({ printPurchaseDocument }) => {
                printPurchaseDocument(createdPurchase, rawSettings);
              });
            }}
            className="w-full justify-center"
          >
            طباعة الفاتورة ({rawSettings?.paperSize === 'receipt' ? 'ريسيت' : 'A4'})
          </Button>
          <Button type="button" variant="secondary" onClick={onNewOrder} className="w-full justify-center">
            فاتورة شراء جديدة
          </Button>
          <button
            type="button"
            onClick={onNavigateToList}
            style={{ marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', fontSize: '0.875rem', borderRadius: '6px' }}
            className="hover:bg-gray-100"
          >
            العودة لسجل الفواتير
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
