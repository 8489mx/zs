import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CheckIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';

interface VanSalesReceiptModalProps {
  receipt: any | null;
  onClose: () => void;
}

export const VanSalesReceiptModal: React.FC<VanSalesReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title="إيصال الفاتورة الميدانية"
      subtitle={`رقم الفاتورة: ${receipt.docNo || '—'}`}
      badge="مبيعات الفان"
      width="min(440px, 95vw)"
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          cancelText="إغلاق"
          extraActions={
            <Button
              variant="primary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px' }}
            >
              <PrinterIcon size={15} />
              <span>طباعة الإيصال</span>
            </Button>
          }
        />
      }
    >
      <div dir="rtl" style={{ textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <CheckIcon size={24} color="#059669" strokeWidth={2.5} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          تم إصدار الفاتورة الميدانية بنجاح
        </h3>
        <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px' }}>
          تم تسجيل الفاتورة في السجل الميداني ويمكن طباعتها فورياً
        </p>

        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', fontSize: '12.5px', textAlign: 'right', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>رقم الفاتورة:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>{receipt.docNo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>العميل:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.customerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>طريقة الدفع:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#166534', fontWeight: 800, paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '13.5px' }}>
            <span>الإجمالي:</span>
            <span>{receipt.total} <CurrencySymbol /></span>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
};
