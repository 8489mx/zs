import React from 'react';
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '28px',
          borderRadius: '16px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            border: '2px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <CheckIcon size={32} color="#059669" strokeWidth={2.5} />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#065f46', margin: '0 0 8px' }}>
          تم إنشاء إذن الصرف بنجاح
        </h2>

        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
          تم إنشاء {createdTransfers.length > 1 ? 'الأذونات بنجاح' : `الإذن رقم ${createdTransfers[0].docNo || createdTransfers[0].id}`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button
            type="button"
            onClick={onPrintReceipt}
            style={{ width: '100%', justifyContent: 'center', backgroundColor: '#170e5e', color: '#ffffff', height: '42px', fontWeight: 800 }}
          >
            طباعة ريسيت (Thermal)
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onPrintA4}
            style={{ width: '100%', justifyContent: 'center', height: '40px', fontWeight: 700 }}
          >
            طباعة وثيقة (A4)
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onNewTransfer}
            style={{ width: '100%', justifyContent: 'center', height: '40px', fontWeight: 700 }}
          >
            إذن صرف جديد
          </Button>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 700,
              padding: '6px',
            }}
          >
            العودة للمخزون
          </button>
        </div>
      </div>
    </div>
  );
};
