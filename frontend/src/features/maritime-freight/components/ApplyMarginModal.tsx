import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { maritimeApi, MaritimeRfq, MaritimeRfqBid } from '../api/maritime-freight.api';

interface ApplyMarginModalProps {
  open: boolean;
  rfq: MaritimeRfq | null;
  bid: MaritimeRfqBid | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyMarginModal({ open, rfq, bid, onClose, onSuccess }: ApplyMarginModalProps) {
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
      setErrorMsg('يرجى إدخال اسم العميل');
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
        const message = `مرحباً ${customerName}، يسعدنا تقديم عرض سعر الشحن البحري:\n` +
          `• مسار الشحنة: من ${rfq.pol_name} إلى ${rfq.pod_name}\n` +
          `• الحاويات والبضاعة: ${rfq.container_count}x ${rfq.container_type} (${rfq.commodity_description})\n` +
          `• الخط الملاحي: ${bid.shipping_line_name}\n` +
          `• فترة السماح بالميناء: ${bid.free_days} يوم بميناء الوصول\n` +
          `• السعر الإجمالي: ${finalTotal.toLocaleString()} ${bid.currency} (ما يعادل تقريباً ${finalTotalLocal.toLocaleString()} ج.م)\n` +
          `• رقم العرض المرجعي: ${quote.quotation_number}\n\nشكراً لاختياركم خدماتنا اللوجستية!`;

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

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تطبيق الهامش الربحي وإصدار عرض السعر (Client Quotation)"
      subtitle={`بناء عرض سعر للعميل بالاعتماد على تسعيرة: ${bid.shipping_line_name}`}
      width="min(740px, 95vw)"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSave(false)}
          isSubmitting={isSubmitting}
          submitText="حفظ وتوليد عرض السعر"
          cancelText="إلغاء"
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* ملخص عرض الخط الملاحي المعتمد */}
        <div style={{ background: '#eff6ff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>الخط الملاحي والتكلفة الأصلية</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {bid.shipping_line_name} — {baseCost.toLocaleString()} {bid.currency}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
              نولون: ${Number(bid.ocean_freight || 0).toLocaleString()} | مصاريف موانئ THC: ${(Number(bid.thc_origin || 0) + Number(bid.thc_destination || 0)).toLocaleString()}$ | سماح: {bid.free_days} يوم
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ padding: '4px 10px', background: '#dbeafe', color: '#1e40af', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
              {rfq.rfq_number}
            </span>
          </div>
        </div>

        {/* بيانات العميل */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="اسم العميل أو الشركة *">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="مثال: شركة النور للاستيراد والتصدير"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="رقم الهاتف أو الواتساب">
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="201012345678"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="البريد الإلكتروني للعميل">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@company.com"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>
        </div>

        {/* ضبط الهامش الربحي وسعر الصرف */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, color: '#170e5e', marginBottom: '12px', fontSize: '0.88rem' }}>
            معادلة احتساب الهامش الربحي (Profit Margin)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <Field label="نوع الهامش الربحي">
              <select
                value={marginType}
                onChange={(e) => setMarginType(e.target.value as any)}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="fixed">مبلغ مقطوع ثابت ($)</option>
                <option value="percentage">نسبة مئوية (%)</option>
              </select>
            </Field>

            <Field label={marginType === 'fixed' ? 'قيمة الهامش ($)' : 'نسبة الهامش (%)'}>
              <input
                type="number"
                min={0}
                value={marginValue}
                onChange={(e) => setMarginValue(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="سعر صرف العملة مقابل الجنيه">
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>
          </div>
        </div>

        {/* بطاقة المعاينة المالية الفورية */}
        <div style={{ background: '#170e5e', color: '#ffffff', padding: '18px 20px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>التكلفة الأساسية (Line Cost)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '4px' }}>
              ${baseCost.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#86efac' }}>صافي الربح المتوقع (Markup)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>
              +${profitAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#fef08a' }}>السعر النهائي للعميل</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#facc15', marginTop: '4px' }}>
              ${finalTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '2px' }}>
              (≈ {finalTotalLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م)
            </div>
          </div>
        </div>

        {/* زر إرسال سريع عبر واتساب */}
        {customerPhone && (
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px',
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <span>حفظ وإرسال عرض السعر فوراً عبر واتساب للعميل</span>
          </button>
        )}
      </div>
    </StandardDialog>
  );
}
