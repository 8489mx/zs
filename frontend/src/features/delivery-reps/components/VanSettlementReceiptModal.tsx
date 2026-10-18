import { useTranslation } from 'react-i18next';
import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CheckIcon, PrinterIcon, ReceiptIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import {
  VanSettlementReceiptData,
  printVanSettlementThermalReceipt,
  formatVanSettlementShareMessage,
} from '../utils/van-settlement-receipt.utils';

interface VanSettlementReceiptModalProps {
  receipt: VanSettlementReceiptData | null;
  onClose: () => void;
  storeName?: string;
}

export const VanSettlementReceiptModal: React.FC<VanSettlementReceiptModalProps> = ({
  receipt,
  onClose,
  storeName,
}) => {
  const { t } = useTranslation();
  if (!receipt) return null;

  const isShortage = receipt.variance < -0.05;
  const isSurplus = receipt.variance > 0.05;
  const isMatched = !isShortage && !isSurplus;

  const handlePrint = () => {
    try {
      printVanSettlementThermalReceipt(receipt, { storeName, widthMm: 80 });
      toast.success('تم إرسال سند توريد العهدة لطابعة الإيصالات الحرارية (80 مم)');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر فتح نافذة الطباعة الحرارية');
    }
  };

  const handleWhatsAppShare = () => {
    const phoneToUse = (receipt.repPhone || '').trim();
    const message = formatVanSettlementShareMessage(receipt);
    if (phoneToUse) {
      const cleanPhone = phoneToUse.replace(/[^0-9]/g, '');
      const target = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
      window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
    toast.info('تم فتح الواتساب لمشاركة سند التوريد وإخلاء الطرف');
  };

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title={t('delivery_reps.van_settlement_receipt_modal.s0', "سند توريد واستلام نقدية الخزينة")}
      subtitle={`سند إخلاء طرف للرحلة #${receipt.tripId} | رقم السند: #${receipt.receiptNo}`}
      badge={t('delivery_reps.van_settlement_receipt_modal.s1', "إبراء عهدة معتمد")}
      width="min(480px, 96vw)"
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          cancelText={t('delivery_reps.van_settlement_receipt_modal.s2', "إغلاق ومتابعة")}
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
                <span>{t('delivery_reps.van_settlement_receipt_modal.s3', "مشاركة السند")}</span>
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
                <span>{t('delivery_reps.van_settlement_receipt_modal.s4', "طباعة السند الحراري (80mm)")}</span>
              </Button>
            </div>
          }
        />
      }
    >
      <div dir="rtl" style={{ textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .standard-dialog-overlay, .standard-dialog-shell { display: none !important; }
          }
        `}</style>

        {/* Top Status Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            backgroundColor: isMatched ? '#dcfce7' : isShortage ? '#fee2e2' : '#e0f2fe',
            color: isMatched ? '#16a34a' : isShortage ? '#dc2626' : '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {isMatched ? (
            <CheckIcon size={24} strokeWidth={3} />
          ) : isShortage ? (
            <AlertTriangleIcon size={24} strokeWidth={2.5} />
          ) : (
            <ReceiptIcon size={24} strokeWidth={2.5} />
          )}
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
          {t('delivery_reps.van_settlement_receipt_modal.s5', "تم استلام النقدية واعتماد تصفية اليومية")}
        </h3>
        <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 12px' }}>
          {t('delivery_reps.van_settlement_receipt_modal.s6', "وثيقة رسمية ثنائية التوقيع تثبت استلام أمين الخزينة للمبالغ المورَّدة من المندوب")}
        </p>

        {/* Official Voucher Preview Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'right',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>{t('delivery_reps.van_settlement_receipt_modal.s7', "المندوب المسلِّم:")}</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{receipt.repName}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>{t('delivery_reps.van_settlement_receipt_modal.s8', "أمين الخزينة المستلم:")}</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e' }}>{receipt.cashierName}</div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
              <span>{t('delivery_reps.van_settlement_receipt_modal.s9', "إجمالي مبيعات الرحلة:")}</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{receipt.salesAmount.toFixed(2)} <CurrencySymbol /></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', paddingRight: '10px' }}>
              <span>{t('delivery_reps.van_settlement_receipt_modal.s10', "• مبيعات كاش بالسيارة:")}</span>
              <span style={{ fontWeight: 700 }}>+{receipt.cashSales.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', paddingRight: '10px' }}>
              <span>{t('delivery_reps.van_settlement_receipt_modal.s11', "• مبيعات آجلة بالذمة:")}</span>
              <span style={{ fontWeight: 700 }}>{receipt.creditSales.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 700, borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
              <span>{t('delivery_reps.van_settlement_receipt_modal.s12', "تحصيلات نقدية (سندات قبض):")}</span>
              <span style={{ fontWeight: 800 }}>+{receipt.collectionsTotal.toFixed(2)} <CurrencySymbol /></span>
            </div>
            {receipt.cashRefunds > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>{t('delivery_reps.van_settlement_receipt_modal.s13', "مرتجعات نقدية صُرفت كاش:")}</span>
                <span style={{ fontWeight: 700 }}>-{receipt.cashRefunds.toFixed(2)} <CurrencySymbol /></span>
              </div>
            )}
            {receipt.tripExpenses > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>{t('delivery_reps.van_settlement_receipt_modal.s14', "مصروفات الرحلة المعتمدة:")}</span>
                <span style={{ fontWeight: 700 }}>-{receipt.tripExpenses.toFixed(2)} <CurrencySymbol /></span>
              </div>
            )}
          </div>

          {/* Net Expected vs Actual Handed Over */}
          <div
            style={{
              backgroundColor: isMatched ? '#ecfdf5' : isShortage ? '#fef2f2' : '#f0f9ff',
              border: `1.5px solid ${isMatched ? '#a7f3d0' : isShortage ? '#fecaca' : '#bae6fd'}`,
              borderRadius: '10px',
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                {t('delivery_reps.van_settlement_receipt_modal.s15', "صافي النقدية المطالب بها:")}
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>
                {receipt.expectedCash.toFixed(2)} <CurrencySymbol />
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                {t('delivery_reps.van_settlement_receipt_modal.s16', "المبلغ المسلَّم فعلياً للخزينة:")}
              </span>
              <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                {receipt.countedCash.toFixed(2)} <CurrencySymbol />
              </span>
            </div>

            {/* Reconciliation Badge */}
            <div
              style={{
                marginTop: '8px',
                padding: '6px 8px',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '11.5px',
                fontWeight: 800,
                backgroundColor: isMatched ? '#dcfce7' : isShortage ? '#fee2e2' : '#e0f2fe',
                color: isMatched ? '#15803d' : isShortage ? '#b91c1c' : '#0369a1',
                border: `1px solid ${isMatched ? '#86efac' : isShortage ? '#fca5a5' : '#7dd3fc'}`,
              }}
            >
              {isMatched
                ? t('delivery_reps.van_settlement_receipt_modal.s17', "الكاش مطابق تماماً للعهدة بنسبة 100% (إبراء ذمة المندوب)")
                : isShortage
                ? `عجز نقدي مثبت: ${Math.abs(receipt.variance).toFixed(2)} ${receipt.variance < 0 ? t('delivery_reps.van_settlement_receipt_modal.s18', "ج.م") : ''} (تم قيده محاسبياً على عهدة المندوب)`
                : `فائض نقدي مثبت: +${receipt.variance.toFixed(2)} ج.م (تم قيده لحساب المنشأة)`}
            </div>
          </div>

          {/* Stock Variance Alert if Any */}
          {receipt.stockVarianceAmount > 0 && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '11px',
                color: '#9f1239',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{t('delivery_reps.van_settlement_receipt_modal.s19', "عجز بضاعة السيارة بالجرد الفعلي:")}</span>
              <span style={{ fontWeight: 900 }}>{receipt.stockVarianceAmount.toFixed(2)} <CurrencySymbol /></span>
            </div>
          )}

          {/* Clearance Notice */}
          <div style={{ fontSize: '10.5px', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
            {t('delivery_reps.van_settlement_receipt_modal.s20', "هذا السند يعتبر إخلاء طرف نهائي للمندوب عن النقدية المورّدة للرحلة المذكورة بموجب اعتماد المشرف وأمين الخزينة.")}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
};
