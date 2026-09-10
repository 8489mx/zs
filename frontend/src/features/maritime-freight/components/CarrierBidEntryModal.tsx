import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
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
      width="min(720px, 95vw)"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* استخلاص ذكي من نص الإيميل (AI Copilot Fast Ingestion) */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#170e5e' }}>
              لصق نص إيميل الخط الملاحي للاستخراج التلقائي (AI Parser):
            </span>
            <button
              type="button"
              onClick={handleParseAi}
              style={{
                padding: '4px 10px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              استخراج البيانات آلياً
            </button>
          </div>
          <textarea
            rows={2}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="انسخ نص رد الإيميل هنا، مثل: OF: 2100 USD, THC 150, 14 free days, TT 20 days..."
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px', fontSize: '0.8rem', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <Field label="الخط الملاحي / الوكيل *">
            <input
              type="text"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
              placeholder="مثال: Maersk / MSC / CMA CGM"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="عملة التسعير *">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            >
              <option value="USD">USD - دولار أمريكي</option>
              <option value="EUR">EUR - يورو أوروبي</option>
              <option value="EGP">EGP - جنيه مصري</option>
              <option value="SAR">SAR - ريال سعودي</option>
            </select>
          </Field>

          <Field label="النولون البحري الأساسي (Ocean Freight) *">
            <input
              type="number"
              min={0}
              value={oceanFreight}
              onChange={(e) => setOceanFreight(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="عوائد ميناء الشحن (Origin THC)">
            <input
              type="number"
              min={0}
              value={thcOrigin}
              onChange={(e) => setThcOrigin(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="عوائد ميناء الوصول (Destination THC)">
            <input
              type="number"
              min={0}
              value={thcDestination}
              onChange={(e) => setThcDestination(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="رسوم الوقود (BAF)">
            <input
              type="number"
              min={0}
              value={bafCharges}
              onChange={(e) => setBafCharges(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="مصاريف أخرى (Other Charges)">
            <input
              type="number"
              min={0}
              value={otherCharges}
              onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="أيام السماح المجانية (Free Days) *">
            <input
              type="number"
              min={1}
              value={freeDays}
              onChange={(e) => setFreeDays(parseInt(e.target.value, 10) || 14)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="مدة الإبحار المتوقعة (Transit Days)">
            <input
              type="number"
              min={0}
              value={transitTimeDays}
              onChange={(e) => setTransitTimeDays(parseInt(e.target.value, 10) || 0)}
              placeholder="مثال: 18 يوم"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="صلاحية العرض حتى تاريخ">
            <input
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="ملاحظات العرض">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط إضافية أو تفاصيل الحجز..."
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
            />
          </Field>
        </div>

        {/* إجمالي تكلفة الشحن */}
        <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>إجمالي تكلفة الشحن (Total Freight Cost):</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#170e5e' }}>
            {totalCost.toLocaleString()} {currency}
          </span>
        </div>
      </div>
    </StandardDialog>
  );
}
