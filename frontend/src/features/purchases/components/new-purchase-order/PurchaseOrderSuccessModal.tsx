import { useTranslation } from 'react-i18next';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
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
  const { t } = useTranslation();
  if (!createdPurchase) return null;

  const handleClose = onClose || onNavigateToList;

  return (
    <StandardDialog
      open={Boolean(createdPurchase)}
      onClose={handleClose}
      title={t('purchases.new_purchase_order.purchase_order_success_modal.s0', "تم إنشاء الفاتورة بنجاح")}
      subtitle={`رقم الفاتورة: ${createdPurchase?.invoiceNumber || createdPurchase?.id || ''}`}
      maxWidth="440px"
      footerActions={
        <StandardDialogFooter
          onCancel={onNavigateToList}
          cancelLabel={t('purchases.new_purchase_order.purchase_order_success_modal.s1', "العودة لسجل الفواتير")}
          onSubmit={onNewOrder}
          submitLabel={t('purchases.new_purchase_order.purchase_order_success_modal.s2', "فاتورة شراء جديدة")}
        />
      }
    >
      <div style={{ textAlign: 'center', padding: '16px 8px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.95rem' }}>
          {t('purchases.new_purchase_order.purchase_order_success_modal.s3', "تم حفظ الفاتورة وتحديث أرصدة الموردين والحسابات ذات الصلة بنجاح.")}
        </p>

        <Button
          type="button"
          onClick={() => {
            import('@/features/purchases/lib/purchases-workspace.helpers').then(({ printPurchaseDocument }) => {
              printPurchaseDocument(createdPurchase, rawSettings);
            });
          }}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {t('purchases.new_purchase_order.purchase_order_success_modal.s4', "طباعة الفاتورة (")}{rawSettings?.paperSize === 'receipt' ? t('purchases.new_purchase_order.purchase_order_success_modal.s5', "ريسيت") : 'A4'})
        </Button>
      </div>
    </StandardDialog>
  );
}
