import { Button } from '@/shared/ui/button';

interface PurchaseOrderSuccessModalProps {
  createdPurchase: any;
  rawSettings: any;
  onNewOrder: () => void;
  onNavigateToList: () => void;
}

export function PurchaseOrderSuccessModal({
  createdPurchase,
  rawSettings,
  onNewOrder,
  onNavigateToList,
}: PurchaseOrderSuccessModalProps) {
  if (!createdPurchase) return null;

  return (
    <div className="purchase-prototype-create-backdrop" style={{ zIndex: 1000 }}>
      <div className="purchase-prototype-create-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2">تم إنشاء الفاتورة بنجاح!</h3>
        <p className="text-gray-500 mb-6 text-sm">
          رقم الفاتورة: <strong>{createdPurchase?.invoiceNumber || createdPurchase?.id}</strong>
        </p>

        <div className="flex flex-col gap-2">
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
            className="btn w-full justify-center mt-2 bg-transparent text-gray-600 hover:bg-gray-100 border-none shadow-none"
            style={{ marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            العودة لسجل الفواتير
          </button>
        </div>
      </div>
    </div>
  );
}
