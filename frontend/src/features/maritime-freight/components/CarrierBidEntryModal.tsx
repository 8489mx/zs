import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { maritimeApi, MaritimeRfq } from '../api/maritime-freight.api';

interface CarrierBidEntryModalProps {
  open: boolean;
  rfq: MaritimeRfq | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CarrierBidEntryModal({ open, rfq, onClose, onSaved }: CarrierBidEntryModalProps) {
  const [lineName, setLineName] = useState('ميرسك (Maersk)');
  const [oceanFreight, setOceanFreight] = useState<number>(1800);
  const [currency, setCurrency] = useState('USD');
  const [thcOrigin, setThcOrigin] = useState<number>(150);
  const [thcDestination, setThcDestination] = useState<number>(120);
  const [bafCharges, setBafCharges] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [transitTimeDays, setTransitTimeDays] = useState<number>(18);
  const [freeDays, setFreeDays] = useState<number>(14);
  const [validityDate, setValidityDate] = useState('');
  const [rawText, setRawText] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!rfq) return null;

  const totalCost = oceanFreight + thcOrigin + thcDestination + bafCharges + otherCharges;

  const handleParseAi = async () => {
    if (!rawText.trim()) return;
    try {
      const parsed = await maritimeApi.parseEmailText(rawText);
      if (parsed.oceanFreight) setOceanFreight(parsed.oceanFreight);
      if (parsed.currency) setCurrency(parsed.currency);
      if (parsed.freeDays) setFreeDays(parsed.freeDays);
      if (parsed.transitTimeDays) setTransitTimeDays(parsed.transitTimeDays);
      if (parsed.thcOrigin) setThcOrigin(parsed.thcOrigin);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!lineName.trim()) {
      setErrorMsg('يرجى تحديد اسم الخط الملاحي أو الوكيل');
      return;
    }
    if (oceanFreight <= 0) {
      setErrorMsg('يرجى إدخال قيمة نولون صحيحة');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await maritimeApi.submitBid({
        rfqId: rfq.id,
        shippingLineName: lineName,
        oceanFreight,
        currency,
        thcOrigin,
        thcDestination,
        bafCharges,
        otherCharges,
        transitTimeDays,
        freeDays,
        validityDate: validityDate || undefined,
        submissionChannel: rawText.trim() ? 'email_auto' : 'manual',
        rawBidData: rawText.trim() ? { rawText } : undefined,
        notes: notes || undefined,
      });

      onSaved();
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
      title="تسجيل عرض سعر خط ملاحي (Record Carrier Bid)"
      subtitle={`تسجيل وإدراج عرض سعر للطلب: ${rfq.rfq_number} (${rfq.pol_code} إلى ${rfq.pod_code})`}
      width="min(880px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSave}
          isSubmitting={isSubmitting}
          submitText="حفظ العرض وإدراجه بالمصفوفة"
          cancelText="إلغاء"
        />
      )}
    >
      <style>{`
        .bid-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 2px !important;
        }
        .bid-compact-modal .field span {
          font-size: 0.72rem !important;
          font-weight: 600 !important;
          color: #475569 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .bid-compact-modal input {
          height: 30px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 8px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
        }
        .bid-compact-modal input:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 1px #170e5e !important;
        }
        .bid-compact-modal .custom-combobox,
        .bid-compact-modal .custom-select-trigger {
          min-height: 30px !important;
          height: 30px !important;
          font-size: 0.78rem !important;
          padding: 0 8px !important;
          border-radius: 6px !important;
        }
      `}</style>

      <div className="bid-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* 1. استخلاص ذكي من نص الإيميل (AI Copilot Fast Ingestion) */}
        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AppIcons.Zap size={13} color="#0284c7" />
              <span>استخراج بيانات العرض تلقائياً من نص رد الإيميل (AI Copilot Fast Ingestion):</span>
            </span>
            <button
              type="button"
              onClick={handleParseAi}
              style={{
                height: '24px',
                padding: '0 10px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '5px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>تحليل واستخراج</span>
            </button>
          </div>
          <textarea
            rows={1}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="انسخ نص رد الخط الملاحي هنا (مثال: OF: 2100 USD, THC: 150 USD, Free Days: 14, TT: 18 days)..."
            style={{
              width: '100%',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              padding: '6px 8px',
              fontSize: '0.78rem',
              resize: 'none',
              boxSizing: 'border-box',
              outline: 'none',
              background: '#ffffff',
            }}
          />
        </div>

        {/* 2. شبكة الحقول المتناسقة هندسياً: 4 أعمدة متساوية العرض لمحاذاة بصرية تامة */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 10px' }}>
          {/* الصف الأول: الأساسيات */}
          <Field label="الخط الملاحي / الوكيل *">
            <input
              type="text"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
              placeholder="مثال: Maersk / MSC / COSCO"
            />
          </Field>

          <Field label="عملة التسعير *">
            <CustomSelect
              value={currency}
              onChange={(val) => setCurrency(val || 'USD')}
              options={[
                { value: 'USD', label: 'USD - دولار أمريكي' },
                { value: 'EUR', label: 'EUR - يورو أوروبي' },
                { value: 'EGP', label: 'EGP - جنيه مصري' },
                { value: 'SAR', label: 'SAR - ريال سعودي' },
              ]}
            />
          </Field>

          <Field label="النولون الأساسي (Ocean Freight) *">
            <input
              type="number"
              min={0}
              value={oceanFreight}
              onChange={(e) => setOceanFreight(parseFloat(e.target.value) || 0)}
            />
          </Field>

          <Field label="أيام السماح المجانية (Free Days) *">
            <input
              type="number"
              min={1}
              value={freeDays}
              onChange={(e) => setFreeDays(parseInt(e.target.value, 10) || 14)}
            />
          </Field>

          {/* الصف الثاني: العوائد والمصاريف */}
          <Field label="عوائد ميناء الشحن (Origin THC)">
            <input
              type="number"
              min={0}
              value={thcOrigin}
              onChange={(e) => setThcOrigin(parseFloat(e.target.value) || 0)}
            />
          </Field>

          <Field label="عوائد ميناء الوصول (Destination THC)">
            <input
              type="number"
              min={0}
              value={thcDestination}
              onChange={(e) => setThcDestination(parseFloat(e.target.value) || 0)}
            />
          </Field>

          <Field label="رسوم الوقود (BAF)">
            <input
              type="number"
              min={0}
              value={bafCharges}
              onChange={(e) => setBafCharges(parseFloat(e.target.value) || 0)}
            />
          </Field>

          <Field label="مصاريف أخرى (Other Charges)">
            <input
              type="number"
              min={0}
              value={otherCharges}
              onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
            />
          </Field>

          {/* الصف الثالث: المواعيد والتفاصيل */}
          <Field label="مدة الإبحار المتوقعة (Transit Days)">
            <input
              type="number"
              min={0}
              value={transitTimeDays}
              onChange={(e) => setTransitTimeDays(parseInt(e.target.value, 10) || 0)}
              placeholder="18 يوم"
            />
          </Field>

          <Field label="صلاحية العرض حتى تاريخ">
            <input
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
            />
          </Field>

          <div style={{ gridColumn: 'span 2' }}>
            <Field label="ملاحظات وشروط العرض (Notes & Terms)">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="شروط إضافية، تفاصيل الحجز، قيود الوزن..."
              />
            </Field>
          </div>
        </div>

        {/* 5. شريط ملخص إجمالي تكلفة الشحن */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
            border: '1px solid #cbd5e1',
            padding: '8px 14px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '40px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.8125rem' }}>
              إجمالي تكلفة الشحن (Total Freight Cost):
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              (النولون: {oceanFreight.toLocaleString()} + المصاريف الإضافية: {(thcOrigin + thcDestination + bafCharges + otherCharges).toLocaleString()} {currency})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#170e5e', fontFamily: 'monospace' }}>
              {totalCost.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>{currency}</span>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
