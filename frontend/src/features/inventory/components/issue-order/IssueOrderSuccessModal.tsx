import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CheckIcon } from '@/shared/components/icons/AppIcons';

interface IssueOrderSuccessModalProps {
  createdTransfers: any[];
  onPrintReceipt: () => void;
  onPrintA4: () => void;
  onNewTransfer: () => void;
  onClose: () => void;
}

export const IssueOrderSuccessModal: React.FC<IssueOrderSuccessModalProps> = ({
  createdTransfers,
  onPrintReceipt,
  onPrintA4,
  onNewTransfer,
  onClose,
}) => {
  if (!createdTransfers.length) return null;

  const docNo = createdTransfers.length > 1
    ? 'أذونات صرف متعددة'
    : (createdTransfers[0]?.docNo || `TR-${createdTransfers[0]?.id}`);

  return (
    <StandardDialog
      open={createdTransfers.length > 0}
      onClose={onClose}
      title="تم إنشاء إذن الصرف بنجاح"
      subtitle={`رقم الإذن: ${docNo}`}
      maxWidth="460px"
      minHeight="auto"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel="العودة للمخزون"
          onSubmit={onNewTransfer}
          submitLabel="إذن صرف جديد"
        />
      }
    >
      <div style={{ textAlign: 'center', padding: '12px 8px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            border: '2px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <CheckIcon size={28} color="#059669" strokeWidth={2.5} />
        </div>

        <p style={{ color: '#64748b', margin: '0 0 18px', fontSize: '0.92rem', lineHeight: 1.5 }}>
          {createdTransfers.length > 1
            ? 'تم اعتماد وحفظ أذونات الصرف بنجاح وتحديث أرصدة المخازن.'
            : `تم اعتماد وحفظ إذن الصرف (${docNo}) بنجاح وتحديث أرصدة المخازن.`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button
            type="button"
            onClick={onPrintReceipt}
            style={{
              width: '100%',
              justifyContent: 'center',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              height: '42px',
              fontWeight: 800,
            }}
          >
            طباعة ريسيت (Thermal)
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onPrintA4}
            style={{
              width: '100%',
              justifyContent: 'center',
              height: '40px',
              fontWeight: 700,
            }}
          >
            طباعة وثيقة (A4)
          </Button>
        </div>
      </div>
    </StandardDialog>
  );
};
