import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { maritimeApi, ShippingPort, ShippingLine } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface CreateRfqModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRfqModal({ open, onClose, onCreated }: CreateRfqModalProps) {
  const [ports, setPorts] = useState<ShippingPort[]>([]);
  const [carriers, setCarriers] = useState<ShippingLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    direction: 'import' as 'import' | 'export' | 'cross_trade',
    polCode: 'CNSHA',
    polName: 'ميناء شنغهاي - الصين',
    podCode: 'EGALY',
    podName: 'ميناء الإسكندرية - مصر',
    incoterm: 'FOB',
    cargoMode: 'FCL',
    containerType: '40HC',
    containerCount: 1,
    commodityDescription: '',
    cargoNature: 'general',
    cargoReadyDate: '',
    targetFreeDays: 14,
    paymentTerm: 'prepaid' as 'prepaid' | 'collect',
    targetLineIds: [] as number[],
    notes: '',
  });

  useEffect(() => {
    if (open) {
      maritimeApi.getPorts().then(setPorts).catch(() => {});
      maritimeApi.getShippingLines().then((lines) => {
        setCarriers(lines);
        // Default select all active carriers
        setFormData((prev) => ({
          ...prev,
          targetLineIds: lines.map((l) => Number(l.id)),
        }));
      }).catch(() => {});
    }
  }, [open]);

  const [carrierFilter, setCarrierFilter] = useState<'all' | 'far_east' | 'europe_med' | 'shipping_line' | 'overseas_agent'>('all');

  const displayedCarriers = carriers.filter((c) => {
    if (carrierFilter === 'shipping_line') return !c.carrier_type || c.carrier_type === 'shipping_line';
    if (carrierFilter === 'overseas_agent') return c.carrier_type === 'overseas_agent';
    if (carrierFilter === 'far_east') return c.trade_lanes?.includes('far_east') || c.country_code === 'CN';
    if (carrierFilter === 'europe_med') return c.trade_lanes?.includes('europe_med') || ['TR', 'DE', 'IT', 'EG'].includes(c.country_code || '');
    return true;
  });

  const handleSelectAllCarriers = () => {
    if (formData.targetLineIds.length === carriers.length) {
      setFormData({ ...formData, targetLineIds: [] });
    } else {
      setFormData({ ...formData, targetLineIds: carriers.map((c) => Number(c.id)) });
    }
  };

  const handleSelectFilteredCarriers = () => {
    const ids = displayedCarriers.map((c) => Number(c.id));
    const allSelected = ids.every((id) => formData.targetLineIds.includes(id));
    if (allSelected) {
      setFormData({
        ...formData,
        targetLineIds: formData.targetLineIds.filter((id) => !ids.includes(id)),
      });
    } else {
      const merged = Array.from(new Set([...formData.targetLineIds, ...ids]));
      setFormData({ ...formData, targetLineIds: merged });
    }
  };

  const handleToggleCarrier = (carrierId: number) => {
    const exists = formData.targetLineIds.includes(carrierId);
    if (exists) {
      setFormData({ ...formData, targetLineIds: formData.targetLineIds.filter((id) => id !== carrierId) });
    } else {
      setFormData({ ...formData, targetLineIds: [...formData.targetLineIds, carrierId] });
    }
  };

  const handlePolChange = (code: string) => {
    const p = ports.find((item) => item.code === code);
    setFormData({
      ...formData,
      polCode: code,
      polName: p ? `${p.name_ar} (${p.country_name})` : code,
    });
  };

  const handlePodChange = (code: string) => {
    const p = ports.find((item) => item.code === code);
    setFormData({
      ...formData,
      podCode: code,
      podName: p ? `${p.name_ar} (${p.country_name})` : code,
    });
  };

  const handleSubmit = async () => {
    if (!formData.polCode || !formData.podCode) {
      setErrorMsg('يرجى تحديد ميناء الشحن وميناء التفريغ');
      return;
    }
    if (!formData.commodityDescription.trim()) {
      setErrorMsg('يرجى إدخال توصيف البضاعة أو الصنف');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await maritimeApi.createRfq(formData);
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إرسال طلب التسعير الملاحي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="طلب تسعير ملاحي جديد (New Ocean RFQ)"
      subtitle="إرسال طلب تسعير فوري للخطوط الملاحية والوكلاء مع كود تتبع آلي [RFQ-YYYY-XXXX]"
      width="min(860px, 95vw)"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitText="إرسال طلب التسعير للخطوط المحددة"
          cancelText="إلغاء"
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Section 1: المسار والاتجاه */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
            <AppIcons.Ship size={18} />
            <span>1. مسار الرحلة والاتجاه (Route & Direction)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="اتجاه الشحنة *">
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="import">شحن وارد (Import - إلى الموانئ المحلية)</option>
                <option value="export">شحن صادر (Export - إلى الموانئ الدولية)</option>
                <option value="cross_trade">شحن وسيط (Cross-Trade - بين دولتين خارجيتين)</option>
              </select>
            </Field>

            <Field label="شرط التسليم الدولي (Incoterm) *">
              <select
                value={formData.incoterm}
                onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="FOB">FOB - تسليم على ظهر السفينة (Free on Board)</option>
                <option value="EXW">EXW - تسليم أرض المصنع (Ex Works)</option>
                <option value="CFR">CFR - التكلفة والنولون (Cost & Freight)</option>
                <option value="CIF">CIF - التكلفة والتأمين والنولون (Cost, Insurance & Freight)</option>
                <option value="DDP">DDP - تسليم خالص الرسوم الجمركية (Delivered Duty Paid)</option>
                <option value="DAP">DAP - تسليم في المكان المعين (Delivered at Place)</option>
              </select>
            </Field>

            <Field label="ميناء الشحن والتحميل (POL) *">
              <select
                value={formData.polCode}
                onChange={(e) => handlePolChange(e.target.value)}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                {ports.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name_ar} - {p.country_name} ({p.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="ميناء التفريغ والمقصد (POD) *">
              <select
                value={formData.podCode}
                onChange={(e) => handlePodChange(e.target.value)}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                {ports.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name_ar} - {p.country_name} ({p.code})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Section 2: بيانات البضاعة والحاويات */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
            <AppIcons.Container size={18} />
            <span>2. البضاعة ومواصفات الحاويات (Cargo & Equipment)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="نمط الشحن *">
              <select
                value={formData.cargoMode}
                onChange={(e) => setFormData({ ...formData, cargoMode: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="FCL">FCL - حمولة حاوية كاملة (Full Container Load)</option>
                <option value="LCL">LCL - حمولة مشتركة مجزأة (Less than Container)</option>
              </select>
            </Field>

            <Field label="مقاس ونوع الحاوية *">
              <select
                value={formData.containerType}
                onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="40HC">40 قدم هاي كيوب (40' High Cube)</option>
                <option value="20GP">20 قدم عادي (20' Standard Dry)</option>
                <option value="40GP">40 قدم عادي (40' Standard Dry)</option>
                <option value="40RF">40 قدم مبرد ريفر (40' Reefer)</option>
                <option value="20RF">20 قدم مبرد ريفر (20' Reefer)</option>
                <option value="45HC">45 قدم هاي كيوب (45' High Cube)</option>
                <option value="OpenTop">حاوية مكشوفة السقف (Open Top)</option>
                <option value="FlatRack">حاوية فلات راك (Flat Rack)</option>
              </select>
            </Field>

            <Field label="عدد الحاويات *">
              <input
                type="number"
                min={1}
                value={formData.containerCount}
                onChange={(e) => setFormData({ ...formData, containerCount: parseInt(e.target.value, 10) || 1 })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="أيام السماح المطلوبة بالميناء (Free Days)">
              <input
                type="number"
                min={7}
                value={formData.targetFreeDays}
                onChange={(e) => setFormData({ ...formData, targetFreeDays: parseInt(e.target.value, 10) || 14 })}
                placeholder="14 أو 21 يوم"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="طريقة سداد النولون *">
              <select
                value={formData.paymentTerm}
                onChange={(e) => setFormData({ ...formData, paymentTerm: e.target.value as any })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="prepaid">Freight Prepaid - مدفوع مقدماً في ميناء الشحن</option>
                <option value="collect">Freight Collect - محصل في ميناء الوصول</option>
              </select>
            </Field>

            <Field label="تاريخ جاهزية البضاعة (CRD)">
              <input
                type="date"
                value={formData.cargoReadyDate}
                onChange={(e) => setFormData({ ...formData, cargoReadyDate: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <div style={{ marginTop: '14px' }}>
            <Field label="توصيف البضاعة والصنف (Commodity Description) *">
              <input
                type="text"
                value={formData.commodityDescription}
                onChange={(e) => setFormData({ ...formData, commodityDescription: e.target.value })}
                placeholder="مثال: قطع غيار سيارات، أقمشة وبوليستر، أجهزة إلكترونية، سيراميك..."
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>
          </div>
        </div>

        {/* Section 3: اختيار الخطوط الملاحية والوكلاء */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
              <AppIcons.Users size={18} />
              <span>3. الخطوط الملاحية والوكلاء المستهدفون ({formData.targetLineIds.length} محدد للإرسال)</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleSelectFilteredCarriers}
                style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'underline' }}
              >
                تحديد/إلغاء المفلترين ({displayedCarriers.length})
              </button>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                onClick={handleSelectAllCarriers}
                style={{ background: 'none', border: 'none', color: '#170e5e', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'underline' }}
              >
                {formData.targetLineIds.length === carriers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>
          </div>

          {/* فلتر سريع للممرات والشركاء */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'far_east', label: 'الصين والشرق الأقصى' },
              { id: 'europe_med', label: 'أوروبا والمتوسط' },
              { id: 'shipping_line', label: 'خطوط الملاحة فقط' },
              { id: 'overseas_agent', label: 'وكلاء الشحن بالخارج' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCarrierFilter(tab.id as any)}
                style={{
                  height: '26px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: carrierFilter === tab.id ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: carrierFilter === tab.id ? '#170e5e' : '#ffffff',
                  color: carrierFilter === tab.id ? '#ffffff' : '#475569',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
            {displayedCarriers.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', gridColumn: '1 / -1' }}>
                لا توجد خطوط أو وكلاء مسجلون في هذا الممر الملاحي
              </div>
            ) : (
              displayedCarriers.map((carrier) => {
                const checked = formData.targetLineIds.includes(Number(carrier.id));
                const isAgent = carrier.carrier_type === 'overseas_agent';
                return (
                  <label
                    key={carrier.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 12px',
                      background: checked ? '#eff6ff' : '#ffffff',
                      border: checked ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleCarrier(Number(carrier.id))}
                          style={{ accentColor: '#170e5e' }}
                        />
                        <span style={{ fontWeight: checked ? 700 : 600, color: checked ? '#1e40af' : '#1e293b' }}>
                          {carrier.name_ar}
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
                        }}
                      >
                        {isAgent ? `وكيل ${carrier.country_name || ''}` : 'خط ملاحي'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', paddingRight: '22px' }}>
                      <span>{carrier.code}</span>
                      <span style={{ color: carrier.rfq_email ? '#0284c7' : '#ef4444' }}>
                        {carrier.rfq_email ? 'إيميل التسعير مفعّل' : 'لا يوجد إيميل'}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
