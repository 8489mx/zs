import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import {
  ShipIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  AlertCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { maritimeApi, MaritimeRfq, MaritimeRfqBid } from '../api/maritime-freight.api';

interface ApplyMarginModalProps {
  open: boolean;
  rfq: MaritimeRfq | null;
  bid: MaritimeRfqBid | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyMarginModal({ open, rfq, bid, onClose, onSuccess }: ApplyMarginModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [customerName, setCustomerName] = useState(rfq?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(rfq?.customer_phone || '');
  const [customerEmail, setCustomerEmail] = useState(rfq?.customer_email || '');
  const [marginType, setMarginType] = useState<'fixed' | 'percentage'>('fixed');
  const [marginValue, setMarginValue] = useState<number>(250);
  const [exchangeRate, setExchangeRate] = useState<number>(48.5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && rfq) {
      setCustomerName(rfq.customer_name || '');
      setCustomerPhone(rfq.customer_phone || '');
      setCustomerEmail(rfq.customer_email || '');
      setErrorMsg(null);
    }
  }, [open, rfq]);

  if (!bid || !rfq) return null;

  const baseCost = Number(bid.total_freight_cost || 0);
  let finalTotal = baseCost;
  let profitAmount = 0;

  if (marginType === 'percentage') {
    profitAmount = baseCost * (marginValue / 100);
    finalTotal = baseCost + profitAmount;
  } else {
    profitAmount = marginValue;
    finalTotal = baseCost + marginValue;
  }

  const finalTotalLocal = finalTotal * exchangeRate;

  const handleSave = async (autoSendWhatsApp = false) => {
    if (!customerName.trim()) {
      setErrorMsg('يرجى إدخال اسم العميل أو المنشأة المستلمة للعرض');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // 1. Award this bid in the RFQ
      await maritimeApi.awardBid(bid.id);

      // 2. Create client quotation
      const quote = await maritimeApi.createQuotation({
        rfqId: rfq.id,
        bidId: bid.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        paymentTerm: rfq.payment_term || 'prepaid',
        baseCost,
        currency: bid.currency || 'USD',
        marginType,
        marginValue,
        exchangeRate,
        notes: `عرض سعر مبني على تسعيرة ${bid.shipping_line_name} برقم طلب ${rfq.rfq_number}`,
      });

      // 3. If WhatsApp requested, open direct chat
      if (autoSendWhatsApp && customerPhone) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        const message =
          `مرحباً ${customerName}، يسعدنا تقديم عرض سعر الشحن البحري:\n` +
          `• مسار الشحنة: من ${rfq.pol_name} إلى ${rfq.pod_name}\n` +
          `• الحاويات والبضاعة: ${rfq.container_count}x ${rfq.container_type} (${rfq.commodity_description})\n` +
          `• الخط الملاحي: ${bid.shipping_line_name}\n` +
          `• فترة السماح بالميناء: ${bid.free_days} يوم بميناء الوصول\n` +
          `• السعر الإجمالي: ${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bid.currency} (ما يعادل تقريباً ${finalTotalLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currencySymbol})\n` +
          `• رقم العرض المرجعي: ${quote.quotation_number}\n\n` +
          `شكراً لاختياركم خدماتنا اللوجستية!`;

        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حفظ عرض السعر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const marginOptions = [
    { value: 'fixed', label: 'مبلغ مقطوع ثابت ($)' },
    { value: 'percentage', label: 'نسبة مئوية مضافة (%)' },
  ];

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تطبيق الهامش الربحي وإصدار عرض السعر"
      subtitle={`إصدار عرض سعر رسمي للعميل مبني على تسعيرة ${bid.shipping_line_name}`}
      width="min(800px, 95vw)"
      footerActions={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minWidth: '100px' }}
          >
            إلغاء
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {customerPhone && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                }}
              >
                <MessageSquareIcon size={16} />
                <span>حفظ ومشاركة فورية عبر واتساب</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(23, 14, 94, 0.25)',
              }}
            >
              <CheckCircleIcon size={16} />
              <span>{isSubmitting ? 'جارٍ إصدار العرض...' : 'حفظ وتوليد عرض السعر'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} dir="rtl">
        {/* تنبيه الخطأ إن وجد */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircleIcon size={16} color="#dc2626" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* بطاقة ملخص تسعيرة الخط الملاحي المعتمد */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#170e5e',
                }}
              >
                <ShipIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>الخط الملاحي المعتمد</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  {bid.shipping_line_name}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  padding: '3px 10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                {rfq.rfq_number}
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#047857',
                }}
              >
                التكلفة الأصلية: ${baseCost.toLocaleString()} {bid.currency}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              color: '#475569',
            }}
          >
            <div>
              <span style={{ color: '#94a3b8' }}>المسار: </span>
              <strong>{rfq.pol_name}</strong> ← <strong>{rfq.pod_name}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>الحمولة: </span>
              <strong>{rfq.container_count}x {rfq.container_type}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>النولون البحري: </span>
              <strong>${Number(bid.ocean_freight || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>مصاريف الموانئ THC: </span>
              <strong>${(Number(bid.thc_origin || 0) + Number(bid.thc_destination || 0)).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>فترة السماح: </span>
              <strong>{bid.free_days || 0} يوم</strong>
            </div>
          </div>
        </div>

        {/* قسم بيانات العميل */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            بيانات العميل المستلم لعرض السعر
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            <Field label="اسم العميل أو المنشأة *">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: شركة النور للاستيراد والتصدير"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </Field>

            <Field label="رقم هاتف / واتساب العميل">
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="201012345678"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </Field>

            <Field label="البريد الإلكتروني للعميل">
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="client@company.com"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </Field>
          </div>
        </div>

        {/* قسم محرك احتساب الهامش الربحي وسعر الصرف */}
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#170e5e',
              marginBottom: '12px',
            }}
          >
            <TrendingUpIcon size={16} color="#170e5e" />
            <span>محرك احتساب الهامش الربحي والتسعير</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            <Field label="طريقة تطبيق الهامش">
              <CustomSelect
                value={marginType}
                onChange={(val) => setMarginType(val as 'fixed' | 'percentage')}
                options={marginOptions}
                placeholder="اختر طريقة الهامش..."
              />
            </Field>

            <Field label={marginType === 'fixed' ? 'قيمة الهامش الربحي ($)' : 'نسبة الهامش المضافة (%)'}>
              <input
                type="number"
                min={0}
                value={marginValue}
                onChange={(e) => setMarginValue(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </Field>

            <Field label="سعر صرف العملة المرجعي">
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </Field>
          </div>
        </div>

        {/* بطاقة المعاينة المالية المؤسسية المعتمدة (Clean Enterprise SaaS Card) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #170e5e',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          {/* 1. التكلفة الأصلية */}
          <div style={{ borderInlineEnd: '1px solid #f1f5f9', paddingInlineEnd: '10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              تكلفة الخط الملاحي (Base Cost)
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginTop: '6px' }}>
              ${baseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
              تكلفة نولون وموانئ رسمية
            </div>
          </div>

          {/* 2. هامش الربح */}
          <div style={{ borderInlineEnd: '1px solid #f1f5f9', paddingInlineEnd: '10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
              هامش الربح المستهدف (Margin Markup)
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
              +${profitAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
              {marginType === 'percentage' ? `(${marginValue}% من التكلفة)` : 'مبلغ مقطوع مضاف'}
            </div>
          </div>

          {/* 3. الإجمالي النهائي للعميل */}
          <div>
            <div style={{ fontSize: '0.76rem', color: '#170e5e', fontWeight: 800 }}>
              إجمالي عرض السعر للعميل (Total Price)
            </div>
            <div style={{ fontSize: '1.38rem', fontWeight: 900, color: '#170e5e', marginTop: '6px' }}>
              ${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
              ≈ {finalTotalLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} <CurrencySymbol />
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}

