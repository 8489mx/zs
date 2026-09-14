import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CheckCircleIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';
import type { StockTransfer } from '@/types/domain';

export function StockTransferSuccessDialog({
  transfer,
  open,
  onClose,
  onPrintA4,
  onPrintReceipt,
}: {
  transfer: StockTransfer | null;
  open: boolean;
  onClose: () => void;
  onPrintA4: () => void;
  onPrintReceipt: () => void;
}) {
  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تم تحويل المخزون بنجاح"
      subtitle="تم تسجيل حركة التحويل وإصدار الوثيقة المخزنية بنجاح"
      size="sm"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel="إغلاق"
          primaryLabel="طباعة وثيقة (A4)"
          onPrimary={onPrintA4}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '12px 0' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
          <CheckCircleIcon size={36} color="#059669" />
        </div>

        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#334155' }}>
            تم إنشاء التحويل رقم <strong style={{ color: '#0f172a' }}>{transfer?.docNo || transfer?.id}</strong>
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            يمكنك طباعة إيصال أو وثيقة A4 لمرافقة البضاعة المنقولة.
          </p>
        </div>

        <div style={{ display: 'flex', width: '100%', gap: '8px', marginTop: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onPrintReceipt}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <PrinterIcon size={14} />
            <span>طباعة ريسيت (Thermal)</span>
          </Button>
        </div>
      </div>
    </StandardDialog>
  );
}
