import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { ComboboxSelect } from '@/shared/ui/ComboboxSelect';
import { CustomSelect } from '@/shared/ui/custom-select';
import { maritimeApi, ShippingPort, ShippingLine } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CarrierSelectionGrid } from './CarrierSelectionGrid';
import { useMaritime } from '../context/MaritimeContext';

interface CreateRfqModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRfqModal({ open, onClose, onCreated }: CreateRfqModalProps) {
  const { pipelineConfig } = useMaritime();
  const enableSeaFreight = pipelineConfig?.enableSeaFreight !== false;
  const enableAirFreight = pipelineConfig?.enableAirFreight !== false;
  const enableRoadFreight = pipelineConfig?.enableRoadFreight !== false;
  const activeModesCount = (enableSeaFreight ? 1 : 0) + (enableAirFreight ? 1 : 0) + (enableRoadFreight ? 1 : 0);

  const [ports, setPorts] = useState<ShippingPort[]>([]);
  const [carriers, setCarriers] = useState<ShippingLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    direction: 'import' as 'import' | 'export' | 'cross_trade',
    transportMode: (enableSeaFreight ? 'sea' : enableAirFreight ? 'air' : 'road') as 'sea' | 'air' | 'road',
    airCargoType: 'general',
    grossWeightKg: '',
    volumetricWeightKg: '',
    chargeableWeightKg: '',
    totalCbm: '',
    packageCount: '1',
    flightNumber: '',
    flightDate: '',
    mawbNumber: '',
    hawbNumber: '',
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
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    targetLineIds: [] as number[],
    notes: '',
    urgencyLevel: 'standard' as 'standard' | 'urgent',
    cutOffHours: 24,
    targetRateMax: '',
  });

  useEffect(() => {
    if (open) {
      maritimeApi.getPorts().then(setPorts).catch(() => {});
      maritimeApi.getShippingLines().then((lines) => {
        setCarriers(lines);
      }).catch(() => {});

      if (!enableSeaFreight && formData.transportMode === 'sea') {
        if (enableAirFreight) handleModeChange('air');
        else if (enableRoadFreight) handleModeChange('road');
      } else if (!enableAirFreight && formData.transportMode === 'air') {
        if (enableSeaFreight) handleModeChange('sea');
        else if (enableRoadFreight) handleModeChange('road');
      } else if (!enableRoadFreight && formData.transportMode === 'road') {
        if (enableSeaFreight) handleModeChange('sea');
        else if (enableAirFreight) handleModeChange('air');
      }
    }
  }, [open, enableSeaFreight, enableAirFreight, enableRoadFreight]);

  const handleCbmChange = (cbmStr: string) => {
    const cbm = parseFloat(cbmStr) || 0;
    const vol = Math.round(cbm * 166.667 * 10) / 10;
    const gross = parseFloat(formData.grossWeightKg) || 0;
    const chg = Math.max(gross, vol);
    setFormData({
      ...formData,
      totalCbm: cbmStr,
      volumetricWeightKg: vol > 0 ? String(vol) : '',
      chargeableWeightKg: chg > 0 ? String(chg) : '',
    });
  };

  const handleGrossWeightChange = (grossStr: string) => {
    const gross = parseFloat(grossStr) || 0;
    const vol = parseFloat(formData.volumetricWeightKg) || 0;
    const chg = Math.max(gross, vol);
    setFormData({
      ...formData,
      grossWeightKg: grossStr,
      chargeableWeightKg: chg > 0 ? String(chg) : '',
    });
  };

  const handleModeChange = (mode: 'sea' | 'air' | 'road') => {
    if (mode === 'air') {
      setFormData({
        ...formData,
        transportMode: 'air',
        polCode: 'CAI',
        polName: 'مطار القاهرة الدولي للشحن (CAI)',
        podCode: 'DXB',
        podName: 'مطار دبي الدولي للشحن (DXB)',
        incoterm: 'FCA',
      });
    } else if (mode === 'road') {
      setFormData({
        ...formData,
        transportMode: 'road',
        polCode: 'EGALY',
        polName: 'ميناء الإسكندرية الجاف',
        podCode: 'CAI',
        podName: 'المنطقة اللوجستية بالعاشر من رمضان',
        incoterm: 'CPT',
      });
    } else {
      setFormData({
        ...formData,
        transportMode: 'sea',
        polCode: 'CNSHA',
        polName: 'ميناء شنغهاي - الصين',
        podCode: 'EGALY',
        podName: 'ميناء الإسكندرية - مصر',
        incoterm: 'FOB',
      });
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

  const [sendImmediately, setSendImmediately] = useState(true);

  const handleSubmit = async () => {
    if (!formData.polCode || !formData.podCode) {
      setErrorMsg(formData.transportMode === 'air' ? 'يرجى تحديد مطار الإقلاع ومطار المقصد' : 'يرجى تحديد ميناء الشحن وميناء التفريغ');
      return;
    }
    if (!formData.commodityDescription.trim()) {
      setErrorMsg('يرجى إدخال توصيف البضاعة أو الصنف');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const gross = parseFloat(formData.grossWeightKg) || 0;
      const cbm = parseFloat(formData.totalCbm) || 0;
      const vol = parseFloat(formData.volumetricWeightKg) || (cbm * 166.667);
      const chg = parseFloat(formData.chargeableWeightKg) || Math.max(gross, vol);

      const payload: any = {
        ...formData,
        targetRateMax: formData.targetRateMax ? parseFloat(formData.targetRateMax) : undefined,
        grossWeightKg: gross,
        volumetricWeightKg: vol,
        chargeableWeightKg: chg,
        totalCbm: cbm,
        packageCount: parseInt(formData.packageCount, 10) || 1,
      };
      const res = await maritimeApi.createRfq(payload);
      if (sendImmediately && res?.id && (formData.targetLineIds?.length || 0) > 0) {
        try {
          await maritimeApi.dispatchRfqEmails(res.id);
        } catch (dispatchErr) {
          console.warn('Dispatch failed:', dispatchErr);
        }
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إرسال طلب التسعير');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="طلب تسعير ملاحي جديد (New Ocean RFQ)"
      subtitle="إرسال طلب تسعير فوري للخطوط الملاحية والوكلاء مع كود تتبع آلي [RFQ-YYMMDD-XXXX]"
      width="min(980px, 96vw)"
      minHeight="auto"
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
      <style>{`
        .rfq-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .rfq-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .rfq-compact-modal input {
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
        }
        .rfq-compact-modal .custom-combobox,
        .rfq-compact-modal .custom-select-trigger {
          min-height: 33px !important;
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
        }
      `}</style>
      <div className="rfq-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {errorMsg && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8rem' }}>
            {errorMsg}
          </div>
        )}

        {/* نمط وسيلة النقل: بحري / جوي / بري */}
        {activeModesCount > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '8px' }}>
            {enableSeaFreight && (
              <button
                type="button"
                onClick={() => handleModeChange('sea')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: formData.transportMode === 'sea' ? '#170e5e' : 'transparent',
                  color: formData.transportMode === 'sea' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Ship size={15} />
                <span>شحن بحري (Ocean Freight)</span>
              </button>
            )}
            {enableAirFreight && (
              <button
                type="button"
                onClick={() => handleModeChange('air')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: formData.transportMode === 'air' ? '#170e5e' : 'transparent',
                  color: formData.transportMode === 'air' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Plane size={15} />
                <span>شحن جوي (Air Freight / AWB)</span>
              </button>
            )}
            {enableRoadFreight && (
              <button
                type="button"
                onClick={() => handleModeChange('road')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: formData.transportMode === 'road' ? '#170e5e' : 'transparent',
                  color: formData.transportMode === 'road' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Truck size={15} />
                <span>نقل بري (Road Freight)</span>
              </button>
            )}
          </div>
        )}

        {/* بيانات العميل أو المستورد */}
        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Users size={15} />
            <span>بيانات العميل أو المستورد (Customer Information - اختياري)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: '10px' }}>
            <Field label="اسم العميل أو الشركة">
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="مثال: شركة النور للاستيراد"
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <Field label="رقم الهاتف أو الواتساب">
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="01012345678"
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <Field label="البريد الإلكتروني للعميل">
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="client@company.com"
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>
        </div>

        {/* Section 1: المسار والاتجاه */}
        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            {formData.transportMode === 'air' ? <AppIcons.Plane size={15} /> : <AppIcons.Ship size={15} />}
            <span>
              {formData.transportMode === 'air' ? '1. مسار الرحلة الجوية والمطارات (Flight Route & Airports)' : '1. مسار الرحلة والاتجاه (Route & Direction)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.6fr 1.6fr', gap: '10px' }}>
            <Field label="اتجاه الشحنة *">
              <CustomSelect
                value={formData.direction}
                onChange={(val) => setFormData({ ...formData, direction: (val || 'import') as any })}
                options={[
                  { value: 'import', label: 'شحن وارد (Import)' },
                  { value: 'export', label: 'شحن صادر (Export)' },
                  { value: 'cross_trade', label: 'شحن وسيط (Cross-Trade)' },
                ]}
              />
            </Field>

            <Field label="شرط التسليم (Incoterm) *">
              <CustomSelect
                value={formData.incoterm}
                onChange={(val) => setFormData({ ...formData, incoterm: val || (formData.transportMode === 'air' ? 'FCA' : 'FOB') })}
                options={formData.transportMode === 'air' ? [
                  { value: 'FCA', label: 'FCA - تسليم للناقل الجوي' },
                  { value: 'CPT', label: 'CPT - النولون مدفوع حتى' },
                  { value: 'CIP', label: 'CIP - شامل التأمين والنولون' },
                  { value: 'EXW', label: 'EXW - أرض المصنع' },
                  { value: 'DAP', label: 'DAP - محل الوصول' },
                  { value: 'DDP', label: 'DDP - خالص الجمارك' },
                ] : [
                  { value: 'FOB', label: 'FOB - على ظهر السفينة' },
                  { value: 'EXW', label: 'EXW - أرض المصنع' },
                  { value: 'CFR', label: 'CFR - التكلفة والنولون' },
                  { value: 'CIF', label: 'CIF - شامل التأمين والنولون' },
                  { value: 'DDP', label: 'DDP - خالص الجمارك' },
                  { value: 'DAP', label: 'DAP - محل الوصول' },
                ]}
              />
            </Field>

            <Field label={formData.transportMode === 'air' ? 'مطار الشحن والإقلاع (POL) *' : 'ميناء الشحن والتحميل (POL) *'}>
              <ComboboxSelect
                value={formData.polCode}
                onChange={handlePolChange}
                options={ports.map((p) => ({
                  id: p.code,
                  label: `${p.name_ar} (${p.code})`,
                }))}
                placeholder={formData.transportMode === 'air' ? 'ابحث عن مطار الإقلاع أو كود IATA...' : 'ابحث عن ميناء الشحن أو الكود...'}
              />
            </Field>

            <Field label={formData.transportMode === 'air' ? 'مطار الوصول والمقصد (POD) *' : 'ميناء التفريغ والمقصد (POD) *'}>
              <ComboboxSelect
                value={formData.podCode}
                onChange={handlePodChange}
                options={ports.map((p) => ({
                  id: p.code,
                  label: `${p.name_ar} (${p.code})`,
                }))}
                placeholder={formData.transportMode === 'air' ? 'ابحث عن مطار الوصول أو كود IATA...' : 'ابحث عن ميناء التفريغ أو الكود...'}
              />
            </Field>
          </div>
        </div>

        {/* Section 2: بيانات البضاعة (حاويات للشحن البحري أو مواصفات أوزان للشحن الجوي) */}
        {formData.transportMode === 'air' ? (
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Plane size={15} />
              <span>2. مواصفات الشحنة الجوية والأوزان (Air Cargo Specs - IATA 1:6000 Standard)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1.1fr 1.1fr', gap: '8px', marginBottom: '6px' }}>
              <Field label="تصنيف البضاعة الجوية *">
                <CustomSelect
                  value={formData.airCargoType}
                  onChange={(val) => setFormData({ ...formData, airCargoType: val || 'general' })}
                  options={[
                    { value: 'general', label: 'بضائع عامة (General Cargo)' },
                    { value: 'perishable', label: 'سريعة التلف (Perishables)' },
                    { value: 'dangerous_goods', label: 'مواد خطرة (DGR / HAZMAT)' },
                    { value: 'valuable', label: 'بضائع ثمينة (Valuable)' },
                    { value: 'pharma', label: 'أدوية ومستحضرات (Pharma)' },
                  ]}
                />
              </Field>

              <Field label="عدد الطرود *">
                <input
                  type="number"
                  min={1}
                  value={formData.packageCount}
                  onChange={(e) => setFormData({ ...formData, packageCount: e.target.value })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الوزن القائم (كجم) *">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={formData.grossWeightKg}
                  onChange={(e) => handleGrossWeightChange(e.target.value)}
                  placeholder="الوزن الفعلي KG"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الحجم (CBM م³) *">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.totalCbm}
                  onChange={(e) => handleCbmChange(e.target.value)}
                  placeholder="متر مكعب"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الوزن الحجمي (كجم)">
                <input
                  type="text"
                  readOnly
                  value={formData.volumetricWeightKg ? `${formData.volumetricWeightKg} KG` : '—'}
                  style={{ width: '100%', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 700 }}
                  title="CBM × 166.667 (معيار إياتا)"
                />
              </Field>

              <Field label="الوزن الخاضع للتحصيل *">
                <input
                  type="text"
                  readOnly
                  value={formData.chargeableWeightKg ? `${formData.chargeableWeightKg} KG` : '—'}
                  style={{ width: '100%', border: '1.5px solid #170e5e', background: '#e0e7ff', fontWeight: 800, color: '#170e5e' }}
                  title="الأكبر بين الوزن الفعلي والوزن الحجمي"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1.2fr', gap: '8px', marginBottom: '6px' }}>
              <Field label="طريقة السداد *">
                <CustomSelect
                  value={formData.paymentTerm}
                  onChange={(val) => setFormData({ ...formData, paymentTerm: (val || 'prepaid') as any })}
                  options={[
                    { value: 'prepaid', label: 'Prepaid - مدفوع مقدماً' },
                    { value: 'collect', label: 'Collect - محصل بالوصول' },
                  ]}
                />
              </Field>

              <Field label="رقم الرحلة (Flight No.)">
                <input
                  type="text"
                  value={formData.flightNumber}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                  placeholder="مثال: MS-777 أو EK-923"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="تاريخ الرحلة (Flight Date)">
                <input
                  type="date"
                  value={formData.flightDate}
                  onChange={(e) => setFormData({ ...formData, flightDate: e.target.value })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="جاهزية البضاعة (CRD)">
                <input
                  type="date"
                  value={formData.cargoReadyDate}
                  onChange={(e) => setFormData({ ...formData, cargoReadyDate: e.target.value })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <Field label="توصيف البضاعة والصنف (Commodity Description) *">
                <input
                  type="text"
                  value={formData.commodityDescription}
                  onChange={(e) => setFormData({ ...formData, commodityDescription: e.target.value })}
                  placeholder="مثال: شحنة إلكترونيات حساسة، أجهزة طبية، قطع غيار عاجلة..."
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Container size={15} />
              <span>2. البضاعة ومواصفات الحاويات (Cargo & Equipment)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 0.8fr 0.9fr 1.2fr 1fr', gap: '8px', marginBottom: '6px' }}>
              <Field label="نمط الشحن *">
                <CustomSelect
                  value={formData.cargoMode}
                  onChange={(val) => setFormData({ ...formData, cargoMode: val || 'FCL' })}
                  options={[
                    { value: 'FCL', label: 'FCL - حاوية كاملة' },
                    { value: 'LCL', label: 'LCL - شحن مجزأ' },
                  ]}
                />
              </Field>

              <Field label="نوع الحاوية *">
                <CustomSelect
                  value={formData.containerType}
                  onChange={(val) => setFormData({ ...formData, containerType: val || '40HC' })}
                  options={[
                    { value: '40HC', label: "40' High Cube (40HC)" },
                    { value: '20GP', label: "20' Dry (20GP)" },
                    { value: '40GP', label: "40' Dry (40GP)" },
                    { value: '40RF', label: "40' Reefer مبرد" },
                    { value: '20RF', label: "20' Reefer مبرد" },
                    { value: '45HC', label: "45' High Cube" },
                    { value: 'OpenTop', label: 'Open Top' },
                    { value: 'FlatRack', label: 'Flat Rack' },
                  ]}
                />
              </Field>

              <Field label="عدد الحاويات *">
                <input
                  type="number"
                  min={1}
                  value={formData.containerCount}
                  onChange={(e) => setFormData({ ...formData, containerCount: parseInt(e.target.value, 10) || 1 })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="أيام السماح (Free Days)">
                <input
                  type="number"
                  min={7}
                  value={formData.targetFreeDays}
                  onChange={(e) => setFormData({ ...formData, targetFreeDays: parseInt(e.target.value, 10) || 14 })}
                  placeholder="14 أو 21 يوم"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="طريقة السداد *">
                <CustomSelect
                  value={formData.paymentTerm}
                  onChange={(val) => setFormData({ ...formData, paymentTerm: (val || 'prepaid') as any })}
                  options={[
                    { value: 'prepaid', label: 'Freight Prepaid - مدفوع مقدماً' },
                    { value: 'collect', label: 'Freight Collect - محصل بالوصول' },
                  ]}
                />
              </Field>

              <Field label="جاهزية البضاعة (CRD)">
                <input
                  type="date"
                  value={formData.cargoReadyDate}
                  onChange={(e) => setFormData({ ...formData, cargoReadyDate: e.target.value })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <Field label="توصيف البضاعة والصنف (Commodity Description) *">
                <input
                  type="text"
                  value={formData.commodityDescription}
                  onChange={(e) => setFormData({ ...formData, commodityDescription: e.target.value })}
                  placeholder="مثال: قطع غيار سيارات، أقمشة وبوليستر، أجهزة إلكترونية، سيراميك..."
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Section 3: أولوية التسعير ومؤقت مهلة استلام العروض */}
        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Clock size={15} />
            <span>3. أولوية التسعير ومؤقت مهلة استلام العروض (Pricing Urgency & Cut-off)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', gap: '10px' }}>
            <Field label="أولوية الطلب والمهلة الافتراضية *">
              <CustomSelect
                value={formData.urgencyLevel}
                onChange={(val) => {
                  const urg = (val || 'standard') as 'standard' | 'urgent';
                  setFormData({
                    ...formData,
                    urgencyLevel: urg,
                    cutOffHours: urg === 'urgent' ? 6 : 24,
                  });
                }}
                options={[
                  { value: 'standard', label: 'عادي (Standard) - مهلة 24 ساعة' },
                  { value: 'urgent', label: 'عاجل فوري (Urgent Spot) - مهلة 6 ساعات' },
                ]}
              />
            </Field>

            <Field label="مهلة تلقي العروض (بالساعات) *">
              <input
                type="number"
                min={1}
                max={168}
                value={formData.cutOffHours}
                onChange={(e) => setFormData({ ...formData, cutOffHours: parseInt(e.target.value, 10) || 24 })}
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <Field label="سقف السعر للترسية المبكرة ($ USD) - اختياري">
              <input
                type="number"
                min={0}
                placeholder="مثال: 1900 (للترسية الفورية إن توفر)"
                value={formData.targetRateMax}
                onChange={(e) => setFormData({ ...formData, targetRateMax: e.target.value })}
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>
        </div>

        {/* Section 4: اختيار الخطوط الملاحية والوكلاء */}
        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem', marginBottom: '8px' }}>
            <AppIcons.Users size={15} />
            <span>4. الخطوط الملاحية والوكلاء المستهدفون للإرسال</span>
          </div>

          <CarrierSelectionGrid
            carriers={carriers}
            selectedIds={formData.targetLineIds}
            onChangeSelectedIds={(ids) => setFormData((prev) => ({ ...prev, targetLineIds: ids }))}
            maxHeight="180px"
          />

          <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
              <input
                type="checkbox"
                checked={sendImmediately}
                onChange={(e) => setSendImmediately(e.target.checked)}
                style={{ accentColor: '#166534', width: 16, height: 16 }}
              />
              <span>إرسال بريد طلب التسعير فوراً للخطوط والوكلاء المحددين ({formData.targetLineIds.length}) عند الإنشاء</span>
            </label>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
