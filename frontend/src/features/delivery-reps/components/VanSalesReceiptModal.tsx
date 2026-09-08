import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CheckIcon } from '@/shared/components/icons/AppIcons';

interface VanSalesReceiptModalProps {
  receipt: any | null;
  onClose: () => void;
}

export const VanSalesReceiptModal: React.FC<VanSalesReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(400px, 95vw)"
      ariaLabel="إيصال الفاتورة الميدانية"
    >
      <div dir="rtl" style={{ textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <CheckIcon size={24} color="#059669" strokeWidth={2.5} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          تم إصدار الفاتورة الميدانية
        </h3>
        <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontSize: '12.5px', textAlign: 'right', border: '1px solid #e2e8f0', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>رقم الفاتورة:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{receipt.docNo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>العميل:</span>
            <span style={{ fontWeight: 700 }}>{receipt.customerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>طريقة الدفع:</span>
            <span style={{ fontWeight: 700 }}>{receipt.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 800, paddingTop: '6px', borderTop: '1px solid #e2e8f0', fontSize: '13.5px' }}>
            <span>الإجمالي:</span>
            <span>{receipt.total} ج.م</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            onClick={() => window.print()}
            style={{ flex: 1, backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px' }}
          >
            طباعة حرارية
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            style={{ flex: 1, fontSize: '12.5px' }}
          >
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
};
