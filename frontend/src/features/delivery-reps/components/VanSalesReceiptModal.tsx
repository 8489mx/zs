import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CheckIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import {
  VanSaleReceiptData,
  printVanSaleThermalReceipt,
  formatVanSaleShareMessage,
} from '../utils/van-sales-receipt.utils';

interface VanSalesReceiptModalProps {
  receipt: VanSaleReceiptData | null;
  onClose: () => void;
  storeName?: string;
}

export const VanSalesReceiptModal: React.FC<VanSalesReceiptModalProps> = ({
  receipt,
  onClose,
  storeName,
}) => {
  if (!receipt) return null;

  const [targetPhone, setTargetPhone] = React.useState(receipt.customerPhone || '');

  const handlePrint = () => {
    try {
      printVanSaleThermalReceipt(receipt, { storeName, widthMm: 80 });
      toast.success('تم تجهيز وإرسال الإيصال الحراري لطابعة الـ 80 مم');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر فتح نافذة الطباعة الحرارية');
    }
  };

  const handleWhatsAppShare = () => {
    const phoneToUse = targetPhone.trim();
    if (!phoneToUse) {
      toast.warning('يرجى إدخال رقم هاتف العميل للمشاركة');
      return;
    }
    const message = formatVanSaleShareMessage(receipt);
    const cleanPhone = phoneToUse.replace(/[^0-9]/g, '');
    const target = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank');
    toast.info('تم فتح تطبيق الواتساب لمشاركة الإيصال');
  };

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title="إيصال الفاتورة الميدانية"
      subtitle={`رقم الفاتورة: #${receipt.docNo || '—'}`}
      badge="مبيعات الفان"
      width="min(500px, 96vw)"
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          cancelText="إغلاق"
          extraActions={
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                onClick={handleWhatsAppShare}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: '#16a34a',
                  color: '#16a34a',
                  fontSize: '12px',
                  fontWeight: 700,
                  height: '38px',
                }}
              >
                <span>مشاركة واتساب</span>
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  height: '38px',
                }}
              >
                <PrinterIcon size={15} />
                <span>طباعة الإيصال (80mm)</span>
              </Button>
            </div>
          }
        />
      }
    >
      <div dir="rtl" style={{ textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
        {/* Anti-fullscreen-print shield */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .standard-dialog-overlay, .standard-dialog-shell { display: none !important; }
          }
        `}</style>

        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '23px',
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
          }}
        >
          <CheckIcon size={24} color="#059669" strokeWidth={2.5} />
        </div>
        <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
          تم إصدار الفاتورة الميدانية بنجاح
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
          تم تسجيل الفاتورة بالسجل الميداني وإرسالها للحسابات ويمكن طباعتها فورياً
        </p>

        {/* RECEIPT SUMMARY CARD */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '12px',
            textAlign: 'right',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>رقم الفاتورة:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#170e5e', fontSize: '13px' }}>
              #{receipt.docNo}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>العميل:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {receipt.customerName}
              {receipt.customerCode ? ` (${receipt.customerCode})` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ color: '#64748b' }}>هاتف واتساب للمشاركة:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="tel"
                inputMode="tel"
                placeholder="أدخل رقم هاتف العميل..."
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                style={{
                  height: '32px',
                  width: '155px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  direction: 'ltr',
                  textAlign: 'right',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>المندوب / السيارة:</span>
            <span style={{ fontWeight: 600, color: '#334155' }}>
              {receipt.repName || 'مندوب التوزيع'}
              {receipt.vehiclePlate ? ` (${receipt.vehiclePlate})` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>طريقة الدفع:</span>
            <span
              style={{
                fontWeight: 700,
                color: receipt.paymentMethod === 'cash' ? '#166534' : (receipt.paymentMethod === 'card' ? '#0369a1' : (receipt.paymentMethod === 'split' ? '#5b21b6' : '#1e40af')),
                backgroundColor: receipt.paymentMethod === 'cash' ? '#dcfce7' : (receipt.paymentMethod === 'card' ? '#e0f2fe' : (receipt.paymentMethod === 'split' ? '#f5f3ff' : '#dbeafe')),
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
              }}
            >
              {receipt.paymentMethod === 'cash'
                ? 'نقدي (مسلم للمندوب)'
                : receipt.paymentMethod === 'card'
                ? 'شبكة / فيزا'
                : receipt.paymentMethod === 'split'
                ? 'دفع مركب (نقدي + آجل)'
                : 'آجل (على حساب العميل)'}
            </span>
          </div>

          {receipt.paymentMethod === 'split' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#faf5ff',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px dashed #d8b4fe',
                fontSize: '11.5px',
              }}
            >
              <span>
                المسدد نقداً: <strong style={{ color: '#059669' }}>{Number(receipt.paidAmount ?? receipt.cashPaid ?? 0).toFixed(2)} <CurrencySymbol /></strong>
              </span>
              <span>
                المتبقي آجل: <strong style={{ color: '#b91c1c' }}>{Number(receipt.remainingCredit ?? receipt.creditOwed ?? Math.max(0, Number(receipt.total) - Number(receipt.paidAmount ?? receipt.cashPaid ?? 0))).toFixed(2)} <CurrencySymbol /></strong>
              </span>
            </div>
          )}

          {receipt.packagingBreakdown && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#eef2ff',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: '#170e5e',
                fontWeight: 700,
              }}
            >
              <span>تفقيط الطرود:</span>
              <span>
                {receipt.packagingBreakdown.cartonsCount ? `${receipt.packagingBreakdown.cartonsCount} كرتونة | ` : ''}
                {receipt.packagingBreakdown.piecesCount ? `${receipt.packagingBreakdown.piecesCount} قطعة | ` : ''}
                {receipt.packagingBreakdown.itemsCount || receipt.items?.length || 1} بنود
              </span>
            </div>
          )}

          {/* ITEM LIST PREVIEW */}
          {receipt.items && receipt.items.length > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                بيان الأصناف المباعة ({receipt.items.length}):
              </div>
              <div
                style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingLeft: '2px',
                }}
                className="thin-scrollbar"
              >
                {receipt.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      border: '1px solid #f1f5f9',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {it.name}{' '}
                      <span style={{ color: '#64748b', fontSize: '10px' }}>
                        × {it.qty} {it.unitName || ''}
                      </span>
                    </span>
                    <span style={{ fontWeight: 700, color: '#170e5e' }}>
                      {(it.lineTotal != null ? it.lineTotal : it.qty * it.unitPrice).toFixed(2)}{' '}
                      <CurrencySymbol />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {receipt.deliveryProofPhoto && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '6px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <span style={{ color: '#64748b' }}>صورة إثبات التسليم:</span>
              <img
                src={receipt.deliveryProofPhoto}
                alt="Proof"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#0f172a',
              fontWeight: 800,
              paddingTop: '8px',
              borderTop: '1.5px solid #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span>الإجمالي المستحق:</span>
            <span style={{ color: '#166534', fontSize: '15px' }}>
              {Number(receipt.total).toFixed(2)} <CurrencySymbol />
            </span>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
};
