import { useState, useEffect } from 'react';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useParams, useSearchParams } from 'react-router-dom';
import { http } from '@/lib/http';
import {
  ShipIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

interface PublicRfqData {
  rfq: {
    id: string;
    rfq_number: string;
    direction: string;
    pol_code: string;
    pol_name: string;
    pod_code: string;
    pod_name: string;
    cargo_mode: string;
    container_type: string;
    container_count: number;
    commodity_description: string;
    cargo_nature: string;
    cargo_ready_date: string | null;
    target_free_days: number;
    incoterm: string;
    payment_term: string;
    status: string;
  };
  carrier: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    carrier_type: string;
  } | null;
  company: {
    name: string;
    email: string;
    phone: string;
  };
}

export function PublicCarrierQuotePage() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const [searchParams] = useSearchParams();
  const carrierCode = searchParams.get('carrier') || '';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<PublicRfqData | null>(null);

  // Form states
  const [carrierName, setCarrierName] = useState('');
  const [oceanFreight, setOceanFreight] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [thcOrigin, setThcOrigin] = useState<number>(0);
  const [thcDestination, setThcDestination] = useState<number>(0);
  const [bafCharges, setBafCharges] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [transitTimeDays, setTransitTimeDays] = useState<number>(18);
  const [freeDays, setFreeDays] = useState<number>(14);
  const [validityDate, setValidityDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!rfqId) return;

    setLoading(true);
    setErrorMsg(null);

    const qs = carrierCode ? `?carrier=${encodeURIComponent(carrierCode)}` : '';
    http<PublicRfqData>(`/api/public/carrier-quote/rfq/${rfqId}${qs}`)
      .then((res) => {
        setData(res);
        if (res.carrier) {
          setCarrierName(res.carrier.name_en || res.carrier.name_ar || res.carrier.code);
        } else if (carrierCode) {
          setCarrierName(carrierCode);
        }
        if (res.rfq.target_free_days) {
          setFreeDays(res.rfq.target_free_days);
        }
      })
      .catch((err: any) => {
        setErrorMsg(err?.message || 'تعذر تحميل بيانات طلب التسعير الملاحي، يرجى التأكد من صحة الرابط');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rfqId, carrierCode]);

  const totalFreight = (Number(oceanFreight) || 0) +
    (Number(thcOrigin) || 0) +
    (Number(thcDestination) || 0) +
    (Number(bafCharges) || 0) +
    (Number(otherCharges) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oceanFreight || oceanFreight <= 0) {
      toast.warning('يرجى إدخال قيمة النولون البحري الأساسي (Ocean Freight)');
      return;
    }

    try {
      setIsSubmitting(true);
      await http(`/api/public/carrier-quote/rfq/${rfqId}/bid`, {
        method: 'POST',
        body: JSON.stringify({
          shippingLineName: carrierName || data?.carrier?.name_en || 'Carrier Desk',
          shippingLineId: data?.carrier?.id,
          oceanFreight,
          currency,
          thcOrigin,
          thcDestination,
          bafCharges,
          otherCharges,
          transitTimeDays,
          freeDays,
          validityDate,
          notes,
        }),
      });
      setIsSubmitted(true);
      toast.success('تم إرسال عرض السعر بنجاح!');
    } catch (err: any) {
      toast.error(err?.message || 'فشل إرسال عرض السعر، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }} dir="rtl">
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px 48px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#170e5e', marginBottom: '8px' }}>جاري تحميل تفاصيل طلب التسعير...</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>يرجى الانتظار لحظات للاتصال ببوابة الشحن البحري</div>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }} dir="rtl">
        <div style={{ background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '12px', padding: '32px 40px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '1.1rem', marginBottom: '8px' }}>تعذر فتح طلب التسعير</div>
          <div style={{ color: '#475569', fontSize: '0.86rem', lineHeight: 1.6 }}>{errorMsg}</div>
        </div>
      </div>
    );
  }

  const { rfq, carrier, company } = data;

  if (isSubmitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }} dir="rtl">
        <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '40px', maxWidth: '560px', width: '100%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', marginBottom: '16px' }}>
            <CheckCircleIcon size={42} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            تم استلام عرض السعر بنجاح!
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px 0' }}>
            شكراً لتعاونكم. تم تسجيل عرض السعر الملاحي بنجاح وإدراجه آلياً في مصفوفة مقارنة الأسعار الخاصة بالطلب <strong>{rfq.rfq_number}</strong> لدى <strong>{company.name}</strong>.
          </p>
          <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px', textAlign: 'right', fontSize: '0.82rem', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>الجهة المقدمة:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{carrierName || carrier?.name_en || 'Carrier'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>إجمالي النولون والمصاريف:</span>
              <span style={{ fontWeight: 800, color: '#15803d' }}>${totalFreight.toLocaleString()} {currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>فترة السماح (Free Days):</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{freeDays} يوم بالمقصد</span>
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
            يمكنكم إغلاق هذه الصفحة الآن أو التواصل مع مكتب العمليات: {company.email}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '30px 20px', fontFamily: 'system-ui, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#170e5e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <ShipIcon size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                بوابة تسعير الشحن البحري (Ocean Freight Spot Quote Portal)
              </h1>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                طلب تسعير صادر من: <strong style={{ color: '#170e5e' }}>{company.name}</strong>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, background: '#eef2ff', color: '#1e40af', padding: '4px 12px', borderRadius: '8px' }}>
              {rfq.rfq_number}
            </span>
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Shipment Specs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.92rem', fontWeight: 800, color: '#170e5e', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                مواصفات الشحنة والمسار المطلوب
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>ميناء الشحن (POL)</div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{rfq.pol_name} <span style={{ color: '#0284c7' }}>({rfq.pol_code})</span></div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>ميناء التفريغ (POD)</div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{rfq.pod_name} <span style={{ color: '#0284c7' }}>({rfq.pod_code})</span></div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>الحاويات ومعدات الشحن</div>
                  <div style={{ fontWeight: 800, color: '#16a34a' }}>{rfq.container_count}x {rfq.container_type} ({rfq.cargo_mode})</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, marginBottom: '2px' }}>بيان وتوصيف البضاعة</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{rfq.commodity_description || 'بضائع عامة (General Cargo)'}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>مهلة السماح المطلوبة</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{rfq.target_free_days || 14} يوم</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>شروط التعاقد / الدفع</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{rfq.incoterm || 'FOB'} ({rfq.payment_term || 'prepaid'})</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Carrier Greeting Card */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', fontSize: '0.82rem', color: '#1e40af' }}>
              <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                مرحباً {carrier?.name_en || carrier?.name_ar || carrierCode || 'بفريق التسعير'}
              </div>
              <div style={{ lineHeight: 1.5 }}>
                يرجى تقديم أفضل سعر نولون فوري متاح مع توضيح رسوم الموانئ وفترة السماح الممنوحة.
              </div>
            </div>
          </div>

          {/* Right Column: Quote Submission Form */}
          <form onSubmit={handleSubmit} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              تسجيل بيانات عرض السعر (Submit Rate Offer)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  اسم الخط الملاحي أو وكيل الشحن *
                </label>
                <input
                  type="text"
                  required
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.86rem', boxSizing: 'border-box' }}
                  placeholder="مثال: Maersk / MSC / Ningbo Agent..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    النولون البحري الأساسي (Ocean Freight) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={oceanFreight || ''}
                    onChange={(e) => setOceanFreight(Number(e.target.value))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                    placeholder="1800"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    العملة *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.86rem', boxSizing: 'border-box', background: '#ffffff' }}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="EGP">EGP (${getGlobalCurrencySymbol()})</option>
                  </select>
                </div>
              </div>

              {/* Local Charges Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    رسوم ميناء الشحن (THC Origin)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={thcOrigin || ''}
                    onChange={(e) => setThcOrigin(Number(e.target.value))}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    رسوم ميناء الوصول (THC Dest)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={thcDestination || ''}
                    onChange={(e) => setThcDestination(Number(e.target.value))}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    رسوم الوقود والمخاطر (BAF / Bunker)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={bafCharges || ''}
                    onChange={(e) => setBafCharges(Number(e.target.value))}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    رسوم محلية أخرى (Other Charges)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={otherCharges || ''}
                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    مدة الإبحار التقديرية (أيام)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={transitTimeDays || ''}
                    onChange={(e) => setTransitTimeDays(Number(e.target.value))}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    placeholder="18"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    فترة السماح الممنوحة (Free Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={freeDays || ''}
                    onChange={(e) => setFreeDays(Number(e.target.value))}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', fontWeight: 700, color: '#16a34a', boxSizing: 'border-box' }}
                    placeholder="14"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  تاريخ نهاية صلاحية السعر (Validity)
                </label>
                <input
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات أو شروط إضافية
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  placeholder="Subject to space & equipment availability, routing via..."
                />
              </div>

              {/* Live Summary Card */}
              <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>إجمالي تكلفة الشحن (All-in Freight):</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>
                    ${totalFreight.toLocaleString()} {currency}
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.78rem', color: '#475569' }}>
                  <div><strong>{freeDays}</strong> يوم سماح</div>
                  <div><strong>{transitTimeDays}</strong> يوم إبحار</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(23, 14, 94, 0.2)',
                  marginTop: '6px',
                }}
              >
                <CheckCircleIcon size={18} />
                <span>{isSubmitting ? 'جاري إرسال العرض...' : 'تقديم عرض السعر رسمياً (Submit Ocean Quote)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
