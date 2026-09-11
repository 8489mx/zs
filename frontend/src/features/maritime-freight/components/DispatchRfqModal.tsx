import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { maritimeApi, MaritimeRfq, ShippingLine } from '../api/maritime-freight.api';
import {
  SearchIcon,
  CheckCircleIcon,
  ShipIcon,
  MailIcon,
} from '@/shared/components/icons/AppIcons';

interface DispatchRfqModalProps {
  open: boolean;
  rfq: MaritimeRfq | null;
  onClose: () => void;
  onDispatched: () => void;
}

export function DispatchRfqModal({ open, rfq, onClose, onDispatched }: DispatchRfqModalProps) {
  const [carriers, setCarriers] = useState<ShippingLine[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<'all' | 'far_east' | 'europe_med' | 'shipping_line' | 'overseas_agent'>('all');
  const [carrierSearch, setCarrierSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && rfq) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setCarrierSearch('');

      maritimeApi
        .getShippingLines()
        .then((lines) => {
          setCarriers(lines);

          // If RFQ already has target lines, preselect them. Otherwise select all active lines.
          const existingTargetIds = Array.isArray(rfq.target_line_ids) && rfq.target_line_ids.length > 0
            ? rfq.target_line_ids
            : lines.map((l) => Number(l.id));

          setSelectedLineIds(existingTargetIds);
        })
        .catch(() => {});
    }
  }, [open, rfq]);

  if (!rfq) return null;

  const displayedCarriers = carriers.filter((c) => {
    if (carrierFilter === 'shipping_line' && c.carrier_type && c.carrier_type !== 'shipping_line') return false;
    if (carrierFilter === 'overseas_agent' && c.carrier_type !== 'overseas_agent') return false;
    if (carrierFilter === 'far_east' && !c.trade_lanes?.includes('far_east') && c.country_code !== 'CN') return false;
    if (carrierFilter === 'europe_med' && !c.trade_lanes?.includes('europe_med') && !['TR', 'DE', 'IT', 'EG'].includes(c.country_code || '')) return false;

    if (carrierSearch.trim()) {
      const q = carrierSearch.toLowerCase().trim();
      const matchNameAr = c.name_ar?.toLowerCase().includes(q);
      const matchNameEn = c.name_en?.toLowerCase().includes(q);
      const matchCode = c.code?.toLowerCase().includes(q);
      const matchEmail = (c.rfq_email || c.email || '').toLowerCase().includes(q);
      const matchCountry = c.country_name?.toLowerCase().includes(q);
      return matchNameAr || matchNameEn || matchCode || matchEmail || matchCountry;
    }
    return true;
  });

  const handleToggleCarrier = (id: number) => {
    if (selectedLineIds.includes(id)) {
      setSelectedLineIds(selectedLineIds.filter((x) => x !== id));
    } else {
      setSelectedLineIds([...selectedLineIds, id]);
    }
  };

  const handleSelectAllCarriers = () => {
    if (selectedLineIds.length === carriers.length) {
      setSelectedLineIds([]);
    } else {
      setSelectedLineIds(carriers.map((c) => Number(c.id)));
    }
  };

  const handleSelectDisplayedOnly = () => {
    const displayedIds = displayedCarriers.map((c) => Number(c.id));
    const allDisplayedSelected = displayedIds.every((id) => selectedLineIds.includes(id));

    if (allDisplayedSelected) {
      setSelectedLineIds(selectedLineIds.filter((id) => !displayedIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedLineIds, ...displayedIds]));
      setSelectedLineIds(merged);
    }
  };

  const handleDispatch = async () => {
    if (selectedLineIds.length === 0) {
      setErrorMsg('يرجى تحديد خط ملاحي أو وكيل شحن واحد على الأقل لإرسال الإيميل إليه');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await maritimeApi.dispatchRfqEmails(rfq.id, selectedLineIds);
      setSuccessMsg(res.message || `تم إرسال الإيميلات بنجاح إلى ${selectedLineIds.length} جهات`);

      setTimeout(() => {
        onDispatched();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إرسال الإيميلات للخطوط المحددة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إرسال طلب تسعير ملاحي: ${rfq.rfq_number}`}
      subtitle="مراجعة بيانات الشحنة وتحديد قائمة الخطوط والوكلاء المستهدفين لإرسال رسائل الاستفسار"
      maxWidth="860px"
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {errorMsg && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleIcon size={18} color="#16a34a" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: بطاقة ملخص الشحنة */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.9rem' }}>
              <ShipIcon size={18} />
              <span>1. بيانات الشحنة ومسار الرحلة (Shipment Route & Specs)</span>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#eef2ff', color: '#1e40af', padding: '3px 10px', borderRadius: '6px' }}>
              {rfq.rfq_number}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>ميناء الشحن (POL)</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.pol_name || rfq.pol_code} <span style={{ color: '#0284c7', fontSize: '0.74rem' }}>({rfq.pol_code})</span></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>ميناء التفريغ (POD)</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.pod_name || rfq.pod_code} <span style={{ color: '#0284c7', fontSize: '0.74rem' }}>({rfq.pod_code})</span></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>الحاويات والنمط</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.container_count}x {rfq.container_type} <span style={{ color: '#16a34a', fontSize: '0.74rem' }}>({rfq.cargo_mode})</span></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>توصيف البضاعة</div>
              <div style={{ color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rfq.commodity_description || 'عام'}>
                {rfq.commodity_description || 'بضائع عامة (General Cargo)'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>مهلة السماح المطلوبة</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.target_free_days || 14} يوم سماح (Free Days)</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '2px' }}>شروط التعاقد والدفع</div>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>{rfq.incoterm || 'FOB'} ({rfq.payment_term || 'prepaid'})</div>
            </div>
          </div>
        </div>

        {/* Section 2: اختيار وتصفية الخطوط والوكلاء */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.9rem' }}>
              <MailIcon size={18} />
              <span>2. تحديد الخطوط والوكلاء المستهدفين للإرسال</span>
              <span style={{ fontSize: '0.76rem', background: '#170e5e', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {selectedLineIds.length} محدد من {carriers.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSelectDisplayedOnly}
                style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}
              >
                تحديد الظاهر فقط
              </button>
              <button
                type="button"
                onClick={handleSelectAllCarriers}
                style={{ background: 'none', border: 'none', color: '#170e5e', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'underline' }}
              >
                {selectedLineIds.length === carriers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>
          </div>

          {/* بحث سريع وفلاتر */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 220px', minWidth: '200px', position: 'relative' }}>
              <input
                type="text"
                value={carrierSearch}
                onChange={(e) => setCarrierSearch(e.target.value)}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="بحث باسم الخط، الوكيل، الكود، أو الإيميل..."
                style={{
                  width: '100%',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px 0 28px',
                  fontSize: '0.8rem',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}>
                <SearchIcon size={14} />
              </span>
            </div>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'far_east', label: 'الصين والشرق الأقصى' },
                { id: 'europe_med', label: 'أوروبا والمتوسط' },
                { id: 'shipping_line', label: 'خطوط ملاحية' },
                { id: 'overseas_agent', label: 'وكلاء شحن' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCarrierFilter(tab.id as any)}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: carrierFilter === tab.id ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    background: carrierFilter === tab.id ? '#170e5e' : '#ffffff',
                    color: carrierFilter === tab.id ? '#ffffff' : '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* شبكة الكروت التفاعلية لاختيار الإيميلات */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '8px',
              background: '#ffffff',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            {displayedCarriers.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                لا توجد خطوط أو وكلاء مطابقة لمعايير البحث
              </div>
            ) : (
              displayedCarriers.map((carrier) => {
                const checked = selectedLineIds.includes(Number(carrier.id));
                const isAgent = carrier.carrier_type === 'overseas_agent';
                const email = carrier.rfq_email || carrier.email;

                return (
                  <label
                    key={carrier.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 10px',
                      background: checked ? '#eff6ff' : '#ffffff',
                      border: checked ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleCarrier(Number(carrier.id))}
                          style={{ accentColor: '#170e5e' }}
                        />
                        <span style={{ fontWeight: checked ? 700 : 600, color: checked ? '#1e40af' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={carrier.name_ar || carrier.name_en}>
                          {carrier.name_ar || carrier.name_en}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: isAgent ? '#f0fdf4' : '#eef2ff',
                          color: isAgent ? '#15803d' : '#1e40af',
                          flexShrink: 0,
                        }}
                      >
                        {isAgent ? `وكيل ${carrier.country_name || ''}` : 'خط ملاحي'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', paddingRight: '22px' }}>
                      <span style={{ fontWeight: 600 }}>{carrier.code}</span>
                      <span style={{ color: email ? '#0284c7' : '#ef4444', direction: 'ltr', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={email || 'لا يوجد بريد'}>
                        {email || 'بدون إيميل'}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Section 3: معاينة الرسالة */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              width: '100%',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            <span>معاينة نص وموضوع الرسالة الرسمية (Email Preview)</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{showPreview ? 'إخفاء المعاينة ▲' : 'عرض المعاينة ▼'}</span>
          </button>

          {showPreview && (
            <div style={{ padding: '14px', fontSize: '0.8rem', color: '#334155', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '8px', padding: '6px 10px', background: '#f1f5f9', borderRadius: '6px', fontWeight: 600 }}>
                <strong>الموضوع:</strong> [{rfq.rfq_number}] Ocean Freight Rate Inquiry: {rfq.pol_code} to {rfq.pod_code} ({rfq.container_count}x {rfq.container_type})
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#fafafa', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px 0' }}>Dear Carrier Pricing Desk,</p>
                <p style={{ margin: '0 0 8px 0' }}>Please provide your most competitive ocean freight spot rate for the following inquiry:</p>
                <ul style={{ margin: '0 0 8px 0', paddingRight: '20px' }}>
                  <li><strong>Reference:</strong> {rfq.rfq_number}</li>
                  <li><strong>Route:</strong> {rfq.pol_name} ({rfq.pol_code}) &rarr; {rfq.pod_name} ({rfq.pod_code})</li>
                  <li><strong>Equipment:</strong> {rfq.container_count}x {rfq.container_type} ({rfq.cargo_mode})</li>
                  <li><strong>Commodity:</strong> {rfq.commodity_description || 'General Cargo'}</li>
                  <li><strong>Free Days:</strong> {rfq.target_free_days || 14} Days</li>
                </ul>
                <p style={{ margin: '0', color: '#64748b', fontSize: '0.74rem' }}>
                  * ستتضمن الرسالة رابطاً سحرياً مخصصاً لكل خط لتسجيل عرضه أونلاين بضغطة واحدة، كما يمكنهم الرد مباشرة على الإيميل ليقوم الذكاء الاصطناعي بقراءة السعر آلياً.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <StandardDialogFooter
        onCancel={onClose}
        onSubmit={handleDispatch}
        isSubmitting={isSubmitting}
        submitText={`تأكيد وإرسال الإيميلات (${selectedLineIds.length} جهة)`}
        cancelText="إلغاء"
      />
    </StandardDialog>
  );
}
